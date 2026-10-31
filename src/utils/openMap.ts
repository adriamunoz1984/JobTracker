import { Alert, Linking, Platform } from 'react-native';

// Open destination coordinates or search query in the user's choice of map app.
export function chooseMapApp(address: string, city?: string) {
  const destination = [address?.trim(), city?.trim()].filter(Boolean).join(', ');
  if (!destination) return;
  const encoded = encodeURIComponent(destination);
  const open = async (url: string) => {
    try { await Linking.openURL(url); }
    catch { Alert.alert('Maps unavailable', 'No compatible map app could open this address.'); }
  };
  Alert.alert('Navigate to address', destination, [
    { text: 'Google Maps', onPress: () => void open('https://www.google.com/maps/search/?api=1&query=' + encoded) },
    { text: 'Default Maps', onPress: () => void open(Platform.OS === 'ios' ? 'http://maps.apple.com/?q=' + encoded : 'geo:0,0?q=' + encoded) },
    { text: 'Cancel', style: 'cancel' },
  ]);
}
