import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Screen } from './components/screen';
import { useRequireSession } from './services/session';

export default function VerificationStatusScreen() {
  const { request } = useRequireSession();
  const [status, setStatus] = useState<string>('Loading');
  useEffect(() => {
    void request<{ verificationLevel?: string }>('/trust/identity/status')
      .then((item) => setStatus(item.verificationLevel ?? 'Not started'))
      .catch(() => setStatus('Unavailable'));
  }, [request]);
  return (
    <Screen
      eyebrow="Trust identity"
      title="Verification status"
      description="Your current TrustPay verification standing."
    >
      <Text>{status}</Text>
    </Screen>
  );
}
