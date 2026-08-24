import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from './components/screen';
import { useRequireSession } from './services/session';

export default function BusinessVerificationScreen() {
  const { request } = useRequireSession();
  const router = useRouter();
  const [businessId, setBusinessId] = useState('');
  const [registeredName, setRegisteredName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const submit = async () => {
    try {
      await request('/trust/business/submit', {
        method: 'POST',
        body: JSON.stringify({ businessId, registeredName, registrationNumber })
      });
      router.replace('/verification-status');
    } catch {
      Alert.alert(
        'Unable to submit',
        'Only an authorized business member can submit this verification.'
      );
    }
  };
  return (
    <Screen
      eyebrow="Trust identity"
      title="Business verification"
      description="Submit your registered business details for TrustPay review."
    >
      <TextInput
        value={businessId}
        onChangeText={setBusinessId}
        placeholder="Business ID"
        autoCapitalize="none"
        style={styles.input}
      />
      <TextInput
        value={registeredName}
        onChangeText={setRegisteredName}
        placeholder="Registered business name"
        style={styles.input}
      />
      <TextInput
        value={registrationNumber}
        onChangeText={setRegistrationNumber}
        placeholder="Registration number"
        style={styles.input}
      />
      <Pressable onPress={submit} style={styles.button}>
        <Text style={styles.text}>Submit for review</Text>
      </Pressable>
    </Screen>
  );
}
const styles = StyleSheet.create({
  input: {
    backgroundColor: '#fff',
    borderColor: '#bfd0c8',
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 12,
    padding: 14
  },
  button: { backgroundColor: '#102a23', borderRadius: 12, marginTop: 16, padding: 16 },
  text: { color: '#fff', fontWeight: '700', textAlign: 'center' }
});
