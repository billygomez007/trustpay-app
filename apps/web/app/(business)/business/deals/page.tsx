import { DashboardShell } from '../../../components/dashboard-shell';

export default function BusinessDealsPage() {
  return (
    <DashboardShell
      area="Business"
      items={['Overview', 'Business Profile', 'Members', 'Deals', 'Settings']}
    >
      <p className="eyebrow">Protected commerce</p>
      <h1>Business Deals</h1>
      <p className="lede">
        Deal creation and state changes are API-controlled, logged, and separated from future
        payment-provider actions.
      </p>
    </DashboardShell>
  );
}
