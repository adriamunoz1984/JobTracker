import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import {
  FINDER_PLACE_CATEGORIES,
  FINDER_PLACE_FEATURES,
  FinderPlaceCategory,
  FinderPlaceFeature,
} from '../types/pumpFinder';
import { createFinderPumperPlace } from '../services/pumpFinderPlaces';
import { useAppTheme, makeStyles } from '../theme';
import ThemedHero from '../components/ThemedHero';

export default function AddFinderPlaceScreen({ navigation }: any) {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<FinderPlaceCategory>('Diesel / Fuel');
  const [address, setAddress] = useState('');
  const [generalArea, setGeneralArea] = useState('');
  const [features, setFeatures] = useState<FinderPlaceFeature[]>([]);
  const [notes, setNotes] = useState('');
  const [dieselPrice, setDieselPrice] = useState('');
  const [pumperRating, setPumperRating] = useState(5);
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const showDieselPrice = useMemo(
    () => category === 'Diesel / Fuel' || features.includes('Diesel'),
    [category, features]
  );

  const toggleFeature = (feature: FinderPlaceFeature) => {
    setFeatures(current =>
      current.includes(feature)
        ? current.filter(item => item !== feature)
        : [...current, feature]
    );
  };

  const useCurrentLocation = async () => {
    try {
      setLocating(true);

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert(
          'Location permission needed',
          'Allow location access if you want Pump Finder to pin this place from where you are standing. You can still type the address manually.'
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude: lat, longitude: lng } = position.coords;
      setLatitude(lat);
      setLongitude(lng);

      try {
        const matches = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lng,
        });
        const match = matches[0];

        if (match) {
          const streetLine = [
            match.streetNumber,
            match.street || match.name,
          ].filter(Boolean).join(' ');

          const fullAddress = [
            streetLine,
            match.city,
            match.region,
            match.postalCode,
          ].filter(Boolean).join(', ');

          const area = [
            match.city || match.district || match.subregion,
            match.region,
          ].filter(Boolean).join(', ');

          if (fullAddress) setAddress(fullAddress);
          if (area) setGeneralArea(area);
        }
      } catch (reverseError) {
        console.warn('Could not reverse geocode pumper place:', reverseError);
      }
    } catch (error) {
      console.error('Could not capture current location:', error);
      Alert.alert(
        'Could not get location',
        'Pump Finder could not read your current location. You can still enter the address manually.'
      );
    } finally {
      setLocating(false);
    }
  };

  const savePlace = async () => {
    const price = dieselPrice.trim() ? Number(dieselPrice) : undefined;

    if (!name.trim() || !address.trim() || !generalArea.trim()) {
      Alert.alert(
        'Missing place details',
        'Add the place name, address, and general area.'
      );
      return;
    }

    if (price !== undefined && (!Number.isFinite(price) || price <= 0)) {
      Alert.alert('Check diesel price', 'Enter a valid diesel price or leave it blank.');
      return;
    }

    try {
      setSaving(true);
      await createFinderPumperPlace({
        name: name.trim(),
        category,
        address: address.trim(),
        generalArea: generalArea.trim(),
        latitude,
        longitude,
        features,
        notes: notes.trim() || undefined,
        pumperRating,
        dieselPrice: price,
      });

      Alert.alert(
        'Place Added',
        'This stop is now available to the Pump Finder community.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error('Could not add pumper-friendly place:', error);
      Alert.alert(
        'Could not add place',
        error?.message || 'Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <ThemedHero
        icon="location-outline"
        title="Add Pumper-Friendly Place"
        subtitle="Share a stop that is actually practical with a pump truck, trailer, or work rig."
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Place</Text>

        <Field
          label="Place name"
          value={name}
          onChangeText={setName}
          placeholder="Example: Pilot, Chevron, In-N-Out"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Type</Text>
        <View style={styles.chipWrap}>
          {FINDER_PLACE_CATEGORIES.map(item => {
            const selected = item === category;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setCategory(item)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Where is it?</Text>
        <Field
          label="Address"
          value={address}
          onChangeText={setAddress}
          placeholder="Street address"
          autoCapitalize="words"
        />
        <Field
          label="General area"
          value={generalArea}
          onChangeText={setGeneralArea}
          placeholder="Palmdale, Lancaster, Santa Clarita, etc."
          autoCapitalize="words"
        />

        <TouchableOpacity
          style={[styles.locationButton, locating && styles.locationButtonDisabled]}
          onPress={useCurrentLocation}
          disabled={locating}
          activeOpacity={0.8}
        >
          <Ionicons name="locate-outline" size={20} color={Colors.primary} />
          <Text style={styles.locationButtonText}>
            {locating ? 'Getting Current Location…' : 'Use My Current Location'}
          </Text>
        </TouchableOpacity>

        <View style={styles.gpsNote}>
          <Ionicons
            name={latitude !== undefined && longitude !== undefined ? 'checkmark-circle-outline' : 'navigate-circle-outline'}
            size={20}
            color={Colors.primary}
          />
          <Text style={styles.gpsNoteText}>
            {latitude !== undefined && longitude !== undefined
              ? 'GPS pin captured. You can still correct the address or area before saving.'
              : 'Using your location saves an exact GPS pin and tries to fill the address automatically. You can also enter everything manually.'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Why is it pumper friendly?</Text>
        <View style={styles.chipWrap}>
          {FINDER_PLACE_FEATURES.map(item => {
            const selected = features.includes(item);
            return (
              <TouchableOpacity
                key={item}
                style={[styles.featureChip, selected && styles.featureChipSelected]}
                onPress={() => toggleFeature(item)}
              >
                <Ionicons
                  name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={17}
                  color={selected ? Colors.onPrimary : Colors.textSecondary}
                />
                <Text
                  style={[
                    styles.featureChipText,
                    selected && styles.featureChipTextSelected,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pumper-friendly rating</Text>
        <Text style={styles.helper}>
          Rate the place for a work rig: room to enter, park, turn around, and leave without a headache.
        </Text>

        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map(star => (
            <TouchableOpacity
              key={star}
              onPress={() => setPumperRating(star)}
              style={styles.starButton}
            >
              <Ionicons
                name={star <= pumperRating ? 'star' : 'star-outline'}
                size={32}
                color={Colors.primary}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {showDieselPrice ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diesel price</Text>
          <Field
            label="Current diesel price"
            value={dieselPrice}
            onChangeText={setDieselPrice}
            placeholder="4.699"
            keyboardType="decimal-pad"
            prefix="$"
            suffix="/ gal"
          />
          <Text style={styles.helper}>
            Leave it blank if you are not sure. Pump Finder will show when a submitted price was last updated.
          </Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pumper notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Example: easy pull-through on west entrance; avoid the small driveway on Avenue S."
          placeholderTextColor={Colors.textLight}
          multiline
          textAlignVertical="top"
          style={styles.notesInput}
        />
        <Text style={styles.helper}>
          Good notes include tight entrances, low canopies, difficult exits, busy times, or where the rig fits best.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={savePlace}
        disabled={saving}
        activeOpacity={0.8}
      >
        <Ionicons name="save-outline" size={20} color={Colors.onPrimary} />
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving…' : 'Add Place'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({ label, prefix, suffix, ...props }: any) {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          {...props}
          placeholderTextColor={Colors.textLight}
          style={[
            styles.input,
            prefix && styles.inputWithPrefix,
            suffix && styles.inputWithSuffix,
          ]}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles(Colors => ({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    paddingLeft: 10,
    marginBottom: 12,
  },
  field: { marginBottom: 12 },
  label: { color: Colors.text, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  inputWrap: { position: 'relative', justifyContent: 'center' },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
  },
  inputWithPrefix: { paddingLeft: 28 },
  inputWithSuffix: { paddingRight: 58 },
  prefix: {
    position: 'absolute',
    left: 13,
    zIndex: 2,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  suffix: {
    position: 'absolute',
    right: 13,
    zIndex: 2,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: Colors.surface,
  },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
  chipTextSelected: { color: Colors.onPrimary },
  featureChip: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  featureChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  featureChipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
  featureChipTextSelected: { color: Colors.onPrimary },
  helper: { color: Colors.textSecondary, fontSize: 12, lineHeight: 18 },
  locationButton: {
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginBottom: 10,
  },
  locationButtonDisabled: { opacity: 0.65 },
  locationButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  gpsNote: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.primaryBg,
    borderRadius: 10,
    padding: 11,
  },
  gpsNoteText: { flex: 1, color: Colors.textSecondary, fontSize: 12, lineHeight: 18 },
  ratingRow: { flexDirection: 'row', marginTop: 10 },
  starButton: { paddingRight: 6 },
  notesInput: {
    minHeight: 105,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 8,
  },
  saveButton: {
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: { opacity: 0.65 },
  saveButtonText: { color: Colors.onPrimary, fontSize: 16, fontWeight: '800' },
}));
