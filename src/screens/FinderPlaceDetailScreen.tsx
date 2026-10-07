import React from 'react';
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FinderPumperPlace } from '../types/pumpFinder';
import { useAppTheme, makeStyles } from '../theme';
import ThemedHero from '../components/ThemedHero';

function updatedLabel(value: any) {
  if (!value) return '';
  try {
    const date =
      typeof value?.toDate === 'function'
        ? value.toDate()
        : value instanceof Date
          ? value
          : new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleString();
  } catch {
    return '';
  }
}

export default function FinderPlaceDetailScreen({ route }: any) {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();
  const place: FinderPumperPlace | undefined = route?.params?.place;

  if (!place) {
    return (
      <View style={styles.empty}>
        <Ionicons name="location-outline" size={48} color={Colors.textSecondary} />
        <Text style={styles.emptyTitle}>Place unavailable</Text>
        <Text style={styles.emptyText}>
          Pump Finder could not load this pumper-friendly place.
        </Text>
      </View>
    );
  }

  const openNavigation = async () => {
    const hasGps =
      place.latitude !== undefined &&
      place.longitude !== undefined;

    const encoded = encodeURIComponent(place.address);
    const url = hasGps
      ? Platform.OS === 'ios'
        ? `maps://?ll=${place.latitude},${place.longitude}&q=${encodeURIComponent(place.name)}`
        : `geo:${place.latitude},${place.longitude}?q=${place.latitude},${place.longitude}(${encodeURIComponent(place.name)})`
      : Platform.OS === 'ios'
        ? `maps://?q=${encoded}`
        : `geo:0,0?q=${encoded}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        throw new Error('Navigation app unavailable');
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        'Could not open navigation',
        'Your phone could not open a maps app for this address.'
      );
    }
  };

  const priceUpdated = updatedLabel(place.dieselPriceUpdatedAt);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ThemedHero
        icon="location-outline"
        title={place.name}
        subtitle={place.generalArea}
      />

      <View style={styles.ratingCard}>
        <View>
          <Text style={styles.ratingLabel}>Pumper-friendly rating</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map(star => (
              <Ionicons
                key={star}
                name={star <= Math.round(place.pumperRating) ? 'star' : 'star-outline'}
                size={23}
                color={Colors.primary}
              />
            ))}
          </View>
        </View>
        <Text style={styles.ratingNumber}>{place.pumperRating.toFixed(1)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <DetailRow
          icon="pricetag-outline"
          label="Type"
          value={place.category}
        />
        <DetailRow
          icon="map-outline"
          label="Area"
          value={place.generalArea}
        />
        <DetailRow
          icon="navigate-outline"
          label="Address"
          value={place.address}
        />
        {place.latitude !== undefined && place.longitude !== undefined ? (
          <DetailRow
            icon="locate-outline"
            label="GPS pin"
            value={`${place.latitude.toFixed(5)}, ${place.longitude.toFixed(5)}`}
          />
        ) : null}

        <TouchableOpacity
          style={styles.navigateButton}
          onPress={openNavigation}
          activeOpacity={0.8}
        >
          <Ionicons name="navigate" size={20} color={Colors.onPrimary} />
          <Text style={styles.navigateButtonText}>Navigate</Text>
        </TouchableOpacity>
      </View>

      {place.dieselPrice ? (
        <View style={styles.priceCard}>
          <View>
            <Text style={styles.priceLabel}>Reported diesel price</Text>
            <Text style={styles.price}>${place.dieselPrice.toFixed(3)} / gal</Text>
            {priceUpdated ? (
              <Text style={styles.priceUpdated}>Updated {priceUpdated}</Text>
            ) : null}
          </View>
          <Ionicons name="water-outline" size={30} color={Colors.primary} />
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rig-friendly features</Text>
        {place.features.length > 0 ? (
          <View style={styles.featureWrap}>
            {place.features.map(feature => (
              <View key={feature} style={styles.featureChip}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>No specific rig features were listed.</Text>
        )}
      </View>

      {place.notes ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pumper notes</Text>
          <Text style={styles.notes}>{place.notes}</Text>
        </View>
      ) : null}

      <View style={styles.communityNote}>
        <Ionicons name="people-outline" size={20} color={Colors.primary} />
        <Text style={styles.communityNoteText}>
          Community confirmations, problem reports, multiple ratings, and live diesel-price updates are the next layer for this feature.
        </Text>
      </View>
    </ScrollView>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();

  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles(Colors => ({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  ratingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primaryBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 12,
  },
  ratingLabel: { color: Colors.text, fontSize: 13, fontWeight: '800' },
  stars: { flexDirection: 'row', gap: 2, marginTop: 5 },
  ratingNumber: { color: Colors.text, fontSize: 28, fontWeight: '900' },
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
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowLabel: { color: Colors.textSecondary, fontSize: 11, fontWeight: '700' },
  rowValue: { color: Colors.text, fontSize: 14, fontWeight: '700', marginTop: 2 },
  navigateButton: {
    minHeight: 46,
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  navigateButtonText: { color: Colors.onPrimary, fontSize: 14, fontWeight: '800' },
  priceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 12,
  },
  priceLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
  price: { color: Colors.text, fontSize: 24, fontWeight: '900', marginTop: 2 },
  priceUpdated: { color: Colors.textSecondary, fontSize: 11, marginTop: 3 },
  featureWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 18,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  featureText: { color: Colors.text, fontSize: 12, fontWeight: '700' },
  muted: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19 },
  notes: { color: Colors.text, fontSize: 14, lineHeight: 21 },
  communityNote: {
    flexDirection: 'row',
    gap: 9,
    backgroundColor: Colors.primaryBg,
    borderRadius: 12,
    padding: 13,
  },
  communityNoteText: { flex: 1, color: Colors.textSecondary, fontSize: 12, lineHeight: 18 },
  empty: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 26,
  },
  emptyTitle: { color: Colors.text, fontSize: 19, fontWeight: '800', marginTop: 8 },
  emptyText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 5 },
}));
