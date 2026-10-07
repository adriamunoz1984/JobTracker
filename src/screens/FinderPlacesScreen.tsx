import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator } from 'react-native-paper';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAppTheme, makeStyles } from '../theme';
import {
  FinderPumperPlace,
  FinderPlaceCategory,
} from '../types/pumpFinder';
import {
  subscribeFinderPumperPlaces,
  subscribeMyFinderPlaceFavorites,
} from '../services/pumpFinderPlaces';
import { openPlaceInGoogleMaps } from '../utils/googleMaps';
import ThemedHero from '../components/ThemedHero';

type FilterValue = 'All' | 'Favorites' | FinderPlaceCategory;

const FILTERS: FilterValue[] = [
  'All',
  'Favorites',
  'Diesel / Fuel',
  'Food / Restaurant',
  'Truck Stop',
  'Parking / Staging',
  'Supply / Parts',
];

const ANTELOPE_VALLEY_REGION = {
  latitude: 34.58,
  longitude: -118.12,
  latitudeDelta: 0.42,
  longitudeDelta: 0.42,
};

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

function categoryIcon(category: FinderPlaceCategory) {
  if (category === 'Diesel / Fuel') return 'water-outline';
  if (category === 'Food / Restaurant') return 'restaurant-outline';
  if (category === 'Parking / Staging') return 'car-outline';
  if (category === 'Truck Stop') return 'trail-sign-outline';
  if (category === 'Supply / Parts') return 'construct-outline';
  return 'location-outline';
}

export default function FinderPlacesScreen({ navigation }: any) {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();
  const mapRef = useRef<MapView | null>(null);

  const [places, setPlaces] = useState<FinderPumperPlace[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterValue>('All');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

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

  useEffect(() => {
    try {
      return subscribeMyFinderPlaceFavorites(
        setFavoriteIds,
        error => console.warn('Could not load saved Pump Finder places:', error)
      );
    } catch (error) {
      console.warn('Could not start saved-place listener:', error);
      return;
    }
  }, []);

  const filteredPlaces = useMemo(() => {
    if (filter === 'All') return places;
    if (filter === 'Favorites') {
      return places.filter(place => favoriteIds.has(place.id));
    }
    return places.filter(place => place.category === filter);
  }, [places, filter, favoriteIds]);

  const mappedPlaces = useMemo(
    () =>
      filteredPlaces.filter(
        place =>
          typeof place.latitude === 'number' &&
          typeof place.longitude === 'number'
      ),
    [filteredPlaces]
  );

  const focusMappedPlaces = () => {
    if (!mapRef.current || mappedPlaces.length === 0) return;

    const coordinates = mappedPlaces.map(place => ({
      latitude: place.latitude as number,
      longitude: place.longitude as number,
    }));

    if (coordinates.length === 1) {
      mapRef.current.animateToRegion(
        {
          ...coordinates[0],
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        },
        350
      );
      return;
    }

    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: { top: 70, right: 50, bottom: 70, left: 50 },
      animated: true,
    });
  };

  useEffect(() => {
    if (!mapReady) return;
    const timer = setTimeout(focusMappedPlaces, 250);
    return () => clearTimeout(timer);
  }, [mapReady, mappedPlaces]);

  const locateMe = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert(
          'Location permission needed',
          'Allow location access to center the Pump Finder map on your current location.'
        );
        return;
      }

      setHasLocationPermission(true);

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      mapRef.current?.animateToRegion(
        {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        },
        400
      );
    } catch (error) {
      console.warn('Could not center pumper-friendly map:', error);
      Alert.alert(
        'Could not get your location',
        'Pump Finder could not center the map on your current location.'
      );
    }
  };

  const openGoogleMaps = async (place: FinderPumperPlace) => {
    try {
      await openPlaceInGoogleMaps(place);
    } catch {
      Alert.alert(
        'Could not open Google Maps',
        'Your phone could not open Google Maps for this place.'
      );
    }
  };

  const renderPlace = ({ item: place }: { item: FinderPumperPlace }) => {
    const priceLabel = priceUpdatedLabel(place.dieselPriceUpdatedAt);
    const isFavorite = favoriteIds.has(place.id);

    return (
      <View style={styles.placeCard}>
        <TouchableOpacity
          onPress={() => navigation.navigate('FinderPlaceDetail', { place })}
          activeOpacity={0.78}
        >
          <View style={styles.placeHeader}>
            <View style={styles.placeIcon}>
              <Ionicons
                name={categoryIcon(place.category) as any}
                size={22}
                color={Colors.primary}
              />
            </View>
            <View style={styles.placeHeadingText}>
              <View style={styles.nameRow}>
                <Text style={styles.placeName}>{place.name}</Text>
                {isFavorite ? (
                  <Ionicons name="star" size={16} color={Colors.primary} />
                ) : null}
              </View>
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
        </TouchableOpacity>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => openGoogleMaps(place)}
            activeOpacity={0.8}
          >
            <Ionicons name="navigate-outline" size={17} color={Colors.primary} />
            <Text style={styles.googleButtonText}>Google Maps</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => navigation.navigate('FinderPlaceDetail', { place })}
            activeOpacity={0.8}
          >
            <Text style={styles.detailsButtonText}>Pumper details</Text>
            <Ionicons name="chevron-forward" size={17} color={Colors.textLight} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const header = (
    <View>
      <ThemedHero
        icon="map-outline"
        title="Pumper-Friendly Places"
        subtitle="Saved community stops that actually work for pump trucks, trailer pumps, and work rigs."
      />

      <View style={styles.callout}>
        <Ionicons name="navigate-outline" size={22} color={Colors.primary} />
        <View style={styles.calloutText}>
          <Text style={styles.calloutTitle}>Built for the rig, not just the driver</Text>
          <Text style={styles.calloutBody}>
            Every new place gets a GPS pin. Tap a marker for its pumper details, or jump straight into Google Maps for directions.
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

      <View style={styles.mapCard}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={ANTELOPE_VALLEY_REGION}
          onMapReady={() => setMapReady(true)}
          showsUserLocation={hasLocationPermission}
          showsMyLocationButton={false}
          showsCompass
        >
          {mappedPlaces.map(place => (
            <Marker
              key={place.id}
              coordinate={{
                latitude: place.latitude as number,
                longitude: place.longitude as number,
              }}
              title={place.name}
              description={
                favoriteIds.has(place.id)
                  ? `★ Saved • ${place.category} • tap for pumper details`
                  : `${place.category} • tap for pumper details`
              }
              onCalloutPress={() =>
                navigation.navigate('FinderPlaceDetail', { place })
              }
            >
              <View style={styles.markerWrap}>
                <View style={styles.markerBubble}>
                  <Ionicons
                    name={categoryIcon(place.category) as any}
                    size={20}
                    color={Colors.onPrimary}
                  />
                </View>
                {favoriteIds.has(place.id) ? (
                  <View style={styles.markerFavorite}>
                    <Ionicons name="star" size={11} color={Colors.onPrimary} />
                  </View>
                ) : null}
              </View>
            </Marker>
          ))}
        </MapView>

        <TouchableOpacity
          style={styles.locateButton}
          onPress={locateMe}
          activeOpacity={0.85}
        >
          <Ionicons name="locate" size={21} color={Colors.primary} />
        </TouchableOpacity>

        <View style={styles.mapCount}>
          <Text style={styles.mapCountText}>
            {mappedPlaces.length} pinned
          </Text>
        </View>
      </View>

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
              {item === 'Favorites' ? (
                <Ionicons
                  name={selected ? 'star' : 'star-outline'}
                  size={14}
                  color={selected ? Colors.onPrimary : Colors.primary}
                />
              ) : null}
              <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                {item === 'All' ? 'All' : item.replace(' / ', ' & ')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.listHeading}>
        <Text style={styles.listTitle}>
          {filter === 'All' ? 'Community Places' : filter}
        </Text>
        <Text style={styles.listCount}>{filteredPlaces.length}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={Colors.primary} />
        <Text style={styles.muted}>Loading pumper-friendly places…</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.loadingScreen}>
        <Ionicons name="warning-outline" size={28} color={Colors.error} />
        <Text style={styles.emptyTitle}>Could not load places</Text>
        <Text style={styles.muted}>{loadError}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={filteredPlaces}
      renderItem={renderPlace}
      keyExtractor={item => item.id}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <View style={styles.emptyCard}>
          <Ionicons
            name={filter === 'Favorites' ? 'star-outline' : 'location-outline'}
            size={34}
            color={Colors.primary}
          />
          <Text style={styles.emptyTitle}>
            {filter === 'Favorites' ? 'No saved places yet' : 'No places in this filter'}
          </Text>
          <Text style={styles.muted}>
            {filter === 'Favorites'
              ? 'Open a place and tap Save to keep your favorite fuel, food, and staging stops handy.'
              : 'Add a pumper-friendly place or choose another filter.'}
          </Text>
        </View>
      }
    />
  );
}

const useStyles = makeStyles(Colors => ({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  loadingScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
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
  mapCard: {
    height: 350,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginBottom: 14,
  },
  map: { flex: 1 },
  locateButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  mapCount: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mapCountText: { color: Colors.text, fontSize: 11, fontWeight: '800' },
  markerWrap: {
    width: 42,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerFavorite: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: { gap: 8, paddingBottom: 14 },
  filterChip: {
    borderWidth: 1,
    borderColor: Colors.borderDark,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  filterChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
  filterTextSelected: { color: Colors.onPrimary },
  listHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  listTitle: { color: Colors.text, fontSize: 17, fontWeight: '800' },
  listCount: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    backgroundColor: Colors.surfaceDark,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  placeName: { color: Colors.text, fontSize: 16, fontWeight: '800', flexShrink: 1 },
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
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 12,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  googleButtonText: { color: Colors.primary, fontSize: 12, fontWeight: '800' },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 7,
  },
  detailsButtonText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
}));
