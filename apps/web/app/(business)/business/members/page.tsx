import { DashboardShell } from '../../../components/dashboard-shell';

export default function BusinessMembersPage() {
  return (
    <DashboardShell
      area="Business"
      items={['Overview', 'Business Profile', 'Members', 'Deals', 'Settings']}
    >
      <p className="eyebrow">Team access</p>
      <h1>Business members</h1>
      <p className="lede">
        Member listing and role changes are served only through tenant-scoped business endpoints.
      </p>
    </DashboardShell>
  );
}
