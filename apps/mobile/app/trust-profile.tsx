import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Screen } from './components/screen';
import { useRequireSession } from './services/session';

export default function TrustProfileScreen() {
  const { request } = useRequireSession();
  const [summary, setSummary] = useState('Loading secure Trust Profile.');
  useEffect(() => {
    void request<{ score?: number; verificationLevel?: string }>('/trust/my-profile')
      .then((profile) =>
        setSummary(
          `Trust score: ${profile.score ?? '—'}\nVerification: ${profile.verificationLevel ?? 'Not started'}`
        )
      )
      .catch(() => setSummary('Trust Profile is unavailable.'));
  }, [request]);
  return (
    <Screen eyebrow="Trust identity" title="Trust Profile" description={summary}>
      <Text>Only your authenticated account can view private trust information.</Text>
    </Screen>
  );
}
