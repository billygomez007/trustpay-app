import { Screen } from './components/screen';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useRequireSession } from './services/session';

export default function CreateDealScreen() {
  const router = useRouter();
  const { request, session } = useRequireSession();
  const [sellerId, setSellerId] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const createDeal = async () => {
    try {
      setSubmitting(true);
      await request('/deals', {
        method: 'POST',
        body: JSON.stringify({
          sellerId,
          title,
          type: 'custom',
          amount: { amount, currency: 'GHS' }
        })
      });
      router.replace('/deals');
    } catch {
      Alert.alert('Unable to create Deal', 'Check the seller ID, title, and amount.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen
      eyebrow="Protected deal"
      title="Agree the terms before payment."
      description="Create a protected agreement. Payment and provider confirmation are intentionally separate from this step."
    >
      {session ? (
        <>
          <TextInput
            autoCapitalize="none"
            onChangeText={setSellerId}
            placeholder="Seller user ID"
            style={form.input}
            value={sellerId}
          />
          <TextInput
            onChangeText={setTitle}
            placeholder="Deal title"
            style={form.input}
            value={title}
          />
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={setAmount}
            placeholder="Amount in GHS"
            style={form.input}
            value={amount}
          />
          <Pressable disabled={submitting} onPress={createDeal} style={form.button}>
            <Text style={form.buttonText}>{submitting ? 'Creating Deal...' : 'Create Deal'}</Text>
          </Pressable>
        </>
      ) : null}
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
