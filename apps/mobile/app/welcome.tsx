import { Screen } from './components/screen';

export default function WelcomeScreen() {
  return (
    <Screen
      eyebrow="Protected commerce"
      title="Trade with confidence."
      description="Create protected deals, verify the people you trade with, and resolve issues through transparent processes."
      actions={[
        { label: 'Create an account', href: '/create-account' },
        { label: 'Sign in', href: '/sign-in' }
      ]}
    />
  );
}
