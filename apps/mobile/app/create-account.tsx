import { Screen } from './components/screen';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from './services/session';

export default function CreateAccountScreen() {
  const router = useRouter();
  const { register } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('GH');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    try {
      setSubmitting(true);
      await register({ name, email, password, country });
      router.replace('/home');
    } catch {
      Alert.alert(
        'Unable to create account',
        'Use a unique email and a password of at least 12 characters.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen
      eyebrow="Get started"
      title="Build trust from the first deal."
      description="We collect only the details needed to establish a secure TrustPay identity."
    >
      <TextInput onChangeText={setName} placeholder="Full name" style={form.input} value={name} />
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
        placeholder="Password (12+ characters)"
        secureTextEntry
        style={form.input}
        value={password}
      />
      <TextInput
        autoCapitalize="characters"
        maxLength={2}
        onChangeText={setCountry}
        placeholder="Country code"
        style={form.input}
        value={country}
      />
      <Pressable disabled={submitting} onPress={submit} style={form.button}>
        <Text style={form.buttonText}>{submitting ? 'Creating account...' : 'Create account'}</Text>
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
