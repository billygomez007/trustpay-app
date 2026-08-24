import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from './components/screen';

export default function VerificationCenterScreen() {
  const router = useRouter();
  return (
    <Screen
      eyebrow="Trust identity"
      title="Verification Center"
      description="Submit your identity or an authorized business verification."
    >
      <Pressable onPress={() => router.push('/identity-verification')} style={styles.button}>
        <Text style={styles.text}>Verify identity</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/business-verification')} style={styles.button}>
        <Text style={styles.text}>Verify business</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/verification-status')} style={styles.button}>
        <Text style={styles.text}>View verification status</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/trust-profile')} style={styles.button}>
        <Text style={styles.text}>View Trust Profile</Text>
      </Pressable>
    </Screen>
  );
}
const styles = StyleSheet.create({
  button: { backgroundColor: '#102a23', borderRadius: 12, marginTop: 12, padding: 16 },
  text: { color: '#fff', fontWeight: '700', textAlign: 'center' }
});
