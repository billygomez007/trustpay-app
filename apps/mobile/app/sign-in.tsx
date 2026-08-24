import { Screen } from './components/screen';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from './services/session';

export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    try {
      setSubmitting(true);
      await signIn({ email, password });
      router.replace('/home');
    } catch {
      Alert.alert('Unable to sign in', 'Check your email and password, then try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen
      eyebrow="Welcome back"
      title="Sign in to TrustPay"
      description="Your session is stored in your device's secure storage."
    >
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        style={form.input}
        value={email}
      />
      <TextInput
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        style={form.input}
        value={password}
      />
      <Pressable disabled={submitting} onPress={submit} style={form.button}>
        <Text style={form.buttonText}>{submitting ? 'Signing in...' : 'Sign in'}</Text>
      </Pressable>
    </Screen>
  );
}

const form = StyleSheet.create({
  input: {
    backgroundColor: '#fff',
    borderColor: '#dbe8e1',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 14,
    padding: 14
  },
  button: { backgroundColor: '#102a23', borderRadius: 12, marginTop: 16, padding: 16 },
  buttonText: { color: '#fff', fontWeight: '700', textAlign: 'center' }
});
