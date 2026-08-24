import { Screen } from './components/screen';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useRequireSession } from './services/session';

export default function DealsScreen() {
  const { session, request } = useRequireSession();
  const [deals, setDeals] = useState<
    Array<{ id: string; title: string; status: string; currency: string; amount: string }>
  >([]);

  useEffect(() => {
    if (session) {
      void request<
        Array<{ id: string; title: string; status: string; currency: string; amount: string }>
      >('/deals')
        .then(setDeals)
        .catch(() => setDeals([]));
    }
  }, [request, session]);

  return (
    <Screen
      eyebrow="Transactions"
      title="My Deals"
      description="Your protected deals use backend-enforced lifecycle states."
      actions={[{ label: 'Create a Deal', href: '/create-deal' }]}
    >
      <View>
        {deals.map((deal) => (
          <Text
            key={deal.id}
          >{`${deal.title}: ${deal.amount} ${deal.currency} - ${deal.status}`}</Text>
        ))}
        {session && deals.length === 0 ? <Text>No Deals yet.</Text> : null}
      </View>
    </Screen>
  );
}
