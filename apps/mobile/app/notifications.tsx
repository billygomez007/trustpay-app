import { Screen } from './components/screen';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useRequireSession } from './services/session';

export default function NotificationsScreen() {
  const { session, request } = useRequireSession();
  const [notifications, setNotifications] = useState<
    Array<{ id: string; title: string; body: string }>
  >([]);

  useEffect(() => {
    if (session) {
      void request<Array<{ id: string; title: string; body: string }>>('/notifications')
        .then(setNotifications)
        .catch(() => setNotifications([]));
    }
  }, [request, session]);

  return (
    <Screen
      eyebrow="Stay informed"
      title="Notifications"
      description="In-app notifications are backed by the TrustPay notification service."
    >
      <View>
        {notifications.map((notification) => (
          <Text key={notification.id}>{`${notification.title}: ${notification.body}`}</Text>
        ))}
        {session && notifications.length === 0 ? <Text>No notifications yet.</Text> : null}
      </View>
    </Screen>
  );
}
