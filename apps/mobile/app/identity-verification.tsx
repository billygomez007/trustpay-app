import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from './components/screen';
import { useRequireSession } from './services/session';

export default function IdentityVerificationScreen() {
  const { request } = useRequireSession();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [reference, setReference] = useState('');
  const submit = async () => {
    try {
      await request('/trust/identity/submit', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          identityReference: reference,
          identityType: 'government_id',
          country: 'GH'
        })
      });
      router.replace('/verification-status');
    } catch {
      Alert.alert('Unable to submit', 'Check the information and try again.');
    }
  };
  return (
    <Screen
      eyebrow="Trust identity"
      title="Identity verification"
      description="Submit protected identity metadata for TrustPay review."
    >
      <TextInput
        value={fullName}
        onChangeText={setFullName}
        placeholder="Full legal name"
        style={styles.input}
      />
      <TextInput
        value={reference}
        onChangeText={setReference}
        placeholder="Identity reference"
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
