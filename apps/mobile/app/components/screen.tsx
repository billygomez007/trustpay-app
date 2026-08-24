import type { PropsWithChildren } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type ScreenProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
  actions?: readonly {
    label: string;
    href:
      | '/welcome'
      | '/sign-in'
      | '/create-account'
      | '/home'
      | '/create-deal'
      | '/deals'
      | '/marketplace'
      | '/notifications'
      | '/profile'
      | '/verification-center'
      | '/identity-verification'
      | '/business-verification'
      | '/verification-status'
      | '/trust-profile';
  }[];
}>;

export function Screen({ eyebrow, title, description, actions = [], children }: ScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.brand}>TrustPay</Text>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {children}
      <View style={styles.actions}>
        {actions.map((action) => (
          <Link href={action.href} key={action.label} asChild>
            <Pressable style={styles.action}>
              <Text style={styles.actionText}>{action.label}</Text>
            </Pressable>
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}

export const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f8f7',
    flexGrow: 1,
    padding: 28,
    paddingTop: 72
  },
  brand: { color: '#0c6d43', fontSize: 22, fontWeight: '800', marginBottom: 52 },
  eyebrow: {
    color: '#0c6d43',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 10,
    textTransform: 'uppercase'
  },
  title: { color: '#102a23', fontSize: 40, fontWeight: '800', letterSpacing: -1, lineHeight: 46 },
  description: { color: '#53675f', fontSize: 17, lineHeight: 26, marginTop: 16 },
  actions: { gap: 12, marginTop: 34 },
  action: { backgroundColor: '#102a23', borderRadius: 12, padding: 16 },
  actionText: { color: '#ffffff', fontSize: 16, fontWeight: '700', textAlign: 'center' }
});
