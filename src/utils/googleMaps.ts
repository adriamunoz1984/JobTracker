import { Linking } from 'react-native';
import { FinderPumperPlace } from '../types/pumpFinder';

export async function openPlaceInGoogleMaps(place: FinderPumperPlace) {
  const hasGps =
    typeof place.latitude === 'number' &&
    typeof place.longitude === 'number';

  const destination = hasGps
    ? `${place.latitude},${place.longitude}`
    : place.address;

  const url =
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;

  await Linking.openURL(url);
}
