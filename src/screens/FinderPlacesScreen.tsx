import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator } from 'react-native-paper';
import { useAppTheme, makeStyles } from '../theme';
import {
  FinderPumperPlace,
  FinderPlaceCategory,
} from '../types/pumpFinder';
import { subscribeFinderPumperPlaces } from '../services/pumpFinderPlaces';
import ThemedHero from '../components/ThemedHero';

const FILTERS: Array<'All' | FinderPlaceCategory> = [
  'All',
  'Diesel / Fuel',
  'Food / Restaurant',
  'Truck Stop',
  'Parking / Staging',
];

function priceUpdatedLabel(value: any) {
  if (!value) return '';
  try {
    const date =
      typeof value?.toDate === 'function'
        ? value.toDate()
        : value instanceof Date
          ? value
          : new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
    if (minutes < 60) return `updated ${minutes || 1} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `updated ${hours} hr ago`;
    const days = Math.round(hours / 24);
    return `updated ${days} day${days === 1 ? '' : 's'} ago`;
  } catch {
    return '';
  }
}

export default function FinderPlacesScreen({ navigation }: any) {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();
  const [places, setPlaces] = useState<FinderPumperPlace[]>([]);
  const [filter, setFilter] = useState<'All' | FinderPlaceCategory>('All');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeFinderPumperPlaces(
      next => {
        setPlaces(next);
        setLoadError('');
        setLoading(false);
      },
      error => {
        console.error('Error loading pumper-friendly places:', error);
        setLoadError('Could not load pumper-friendly places.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredPlaces = useMemo(
    () =>
      filter === 'All'
        ? places
        : places.filter(place => place.category === filter),
    [places, filter]
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ThemedHero
        icon="map-outline"
        title="Pumper-Friendly Places"
        subtitle="Community stops that actually work for pump trucks, trailer pumps, and work rigs."
      />

      <View style={styles.callout}>
        <Ionicons name="navigate-outline" size={22} color={Colors.primary} />
        <View style={styles.calloutText}>
          <Text style={styles.calloutTitle}>Built for the rig, not just the driver</Text>
          <Text style={styles.calloutBody}>
            Save places with room to enter, park, turn around, pull through, fuel up, eat, and get back on the road.
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddFinderPlace')}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle-outline" size={21} color={Colors.onPrimary} />
        <Text style={styles.addButtonText}>Add Pumper-Friendly Place</Text>
      </TouchableOpacity>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {FILTERS.map(item => {
          const selected = filter === item;
          return (
            <TouchableOpacity
              key={item}
              style={[styles.filterChip, selected && styles.filterChipSelected]}
              onPress={() => setFilter(item)}
            >
              <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                {item === 'All' ? 'All' : item.replace(' / ', ' & ')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.muted}>Loading places…</Text>
        </View>
      ) : loadError ? (
        <View style={styles.emptyCard}>
          <Ionicons name="warning-outline" size={28} color={Colors.error} />
          <Text style={styles.emptyTitle}>Could not load places</Text>
          <Text style={styles.muted}>{loadError}</Text>
        </View>
      ) : filteredPlaces.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="location-outline" size={34} color={Colors.primary} />
          <Text style={styles.emptyTitle}>No places added yet</Text>
          <Text style={styles.muted}>
            Add the first diesel stop, restaurant, truck stop, or parking spot that works well with a pump rig.
          </Text>
        </View>
      ) : (
        filteredPlaces.map(place => {
          const priceLabel = priceUpdatedLabel(place.dieselPriceUpdatedAt);
          return (
            <TouchableOpacity
              key={place.id}
              style={styles.placeCard}
              onPress={() => navigation.navigate('FinderPlaceDetail', { place })}
              activeOpacity={0.78}
            >
              <View style={styles.placeHeader}>
                <View style={styles.placeIcon}>
                  <Ionicons
                    name={
                      place.category === 'Diesel / Fuel'
                        ? 'water-outline'
                        : place.category === 'Food / Restaurant'
                          ? 'restaurant-outline'
                          : place.category === 'Parking / Staging'
                            ? 'car-outline'
                            : 'location-outline'
                    }
                    size={22}
                    color={Colors.primary}
                  />
                </View>
                <View style={styles.placeHeadingText}>
                  <Text style={styles.placeName}>{place.name}</Text>
                  <Text style={styles.placeArea}>{place.generalArea}</Text>
                </View>
                <View style={styles.ratingPill}>
                  <Ionicons name="star" size={14} color={Colors.primary} />
                  <Text style={styles.ratingText}>{place.pumperRating.toFixed(1)}</Text>
                </View>
              </View>

              <Text style={styles.category}>{place.category}</Text>

              {place.dieselPrice ? (
                <View style={styles.priceRow}>
                  <Text style={styles.price}>Diesel ${place.dieselPrice.toFixed(3)}</Text>
                  {priceLabel ? <Text style={styles.priceAge}>{priceLabel}</Text> : null}
                </View>
              ) : null}

              {place.features.length > 0 ? (
                <View style={styles.featureWrap}>
                  {place.features.slice(0, 4).map(feature => (
                    <View key={feature} style={styles.featureChip}>
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                  {place.features.length > 4 ? (
                    <Text style={styles.moreText}>+{place.features.length - 4} more</Text>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.viewRow}>
                <Text style={styles.viewText}>View pumper details</Text>
                <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const useStyles = makeStyles(Colors => ({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  callout: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.primaryBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 12,
  },
  calloutText: { flex: 1 },
  calloutTitle: { color: Colors.text, fontSize: 14, fontWeight: '800' },
  calloutBody: { color: Colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 3 },
  addButton: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  addButtonText: { color: Colors.onPrimary, fontSize: 15, fontWeight: '800' },
  filters: { gap: 8, paddingBottom: 14 },
  filterChip: {
    borderWidth: 1,
    borderColor: Colors.borderDark,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
  filterTextSelected: { color: Colors.onPrimary },
  loadingWrap: { alignItems: 'center', gap: 8, paddingVertical: 28 },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: { color: Colors.text, fontSize: 17, fontWeight: '800', marginTop: 8, marginBottom: 4 },
  muted: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  placeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 12,
  },
  placeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  placeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeHeadingText: { flex: 1 },
  placeName: { color: Colors.text, fontSize: 16, fontWeight: '800' },
  placeArea: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryBg,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  ratingText: { color: Colors.text, fontSize: 12, fontWeight: '800' },
  category: { color: Colors.primary, fontSize: 12, fontWeight: '800', marginTop: 10 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 8 },
  price: { color: Colors.text, fontSize: 18, fontWeight: '900' },
  priceAge: { color: Colors.textSecondary, fontSize: 11 },
  featureWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, alignItems: 'center' },
  featureChip: { backgroundColor: Colors.primaryBg, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 5 },
  featureText: { color: Colors.text, fontSize: 11, fontWeight: '700' },
  moreText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '700' },
  viewRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 12,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
}));
