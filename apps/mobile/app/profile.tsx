import { Screen } from './components/screen';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useRequireSession } from './services/session';

export default function ProfileScreen() {
  const router = useRouter();
  const { session, signOut } = useRequireSession();
  const logout = async () => {
    try {
      await signOut();
      router.replace('/welcome');
    } catch {
      Alert.alert('Unable to sign out', 'Please try again.');
    }
  };

  return (
    <Screen
      eyebrow="Your account"
      title="Profile and verification"
      description={
        session
          ? `${session.user.email}. Identity, verification, and device controls are expanding here.`
          : 'Loading secure profile.'
      }
      actions={[
        { label: 'Verification Center', href: '/verification-center' },
        { label: 'View notifications', href: '/notifications' }
      ]}
    >
      {session ? (
        <Pressable onPress={logout} style={styles.button}>
          <Text style={styles.buttonText}>Sign out</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: '#102a23', borderRadius: 12, marginTop: 18, padding: 16 },
  buttonText: { color: '#fff', fontWeight: '700', textAlign: 'center' }
});
