import { useEffect, useState } from 'react';
import { Screen, styles } from './components/screen';
import { StyleSheet, Text, View } from 'react-native';
import { useRequireSession } from './services/session';

const cards = [
  'Protect a Deal',
  'Buy on TrustPay',
  'Sell on TrustPay',
  'My Transactions',
  'Ask TrustPay AI'
];

export default function HomeScreen() {
  const { session, request } = useRequireSession();
  const [notificationCount, setNotificationCount] = useState<number | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }
    void request<Array<{ readAt: string | null }>>('/notifications')
      .then((notifications) =>
        setNotificationCount(notifications.filter((item) => !item.readAt).length)
      )
      .catch(() => setNotificationCount(null));
  }, [request, session]);

  return (
    <Screen
      eyebrow="Your TrustPay"
      title={session ? `Welcome, ${session.user.name}.` : 'A safer way to do business.'}
      description="Begin a protected transaction once both parties have agreed on the terms."
      actions={[
        { label: 'Create a Deal', href: '/create-deal' },
        { label: 'View My Deals', href: '/deals' }
      ]}
    >
      <View style={localStyles.cards}>
        {cards.map((card) => (
          <View key={card} style={localStyles.card}>
            <Text style={styles.eyebrow}>{card}</Text>
            <Text style={localStyles.cardText}>
              {card === 'My Transactions'
                ? 'View Deals created through your protected account.'
                : card === 'Ask TrustPay AI'
                  ? 'Human-approved AI assistance is prepared for a later phase.'
                  : 'Continue to the relevant TrustPay workflow.'}
            </Text>
          </View>
        ))}
      </View>
      {notificationCount !== null ? (
        <Text style={localStyles.notifications}>{notificationCount} unread notifications</Text>
      ) : null}
    </Screen>
  );
}

const localStyles = StyleSheet.create({
  cards: { gap: 12, marginTop: 32 },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#dbe8e1',
    borderRadius: 12,
    borderWidth: 1,
    padding: 18
  },
  cardText: { color: '#53675f', lineHeight: 21 },
  notifications: { color: '#0c6d43', fontWeight: '700', marginTop: 20 }
});
