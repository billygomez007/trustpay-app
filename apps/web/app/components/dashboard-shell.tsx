import Link from 'next/link';

type DashboardShellProps = Readonly<{
  area: 'Business' | 'Operations' | 'Customer';
  items: readonly string[];
  children: React.ReactNode;
}>;

export function DashboardShell({ area, items, children }: DashboardShellProps) {
  const basePath =
    area === 'Business' ? '/business' : area === 'Operations' ? '/operations' : '/portal';
  const customerPaths: Record<string, string> = {
    Home: '/portal',
    'My Deals': '/portal/deals',
    Invitations: '/portal/deals',
    'Trust Profile': '/portal/trust',
    Notifications: '/portal/notifications',
    Profile: '/portal/trust'
  };

  return (
    <main className="dashboard">
      <aside className="sidebar">
        <Link className="brand" href={basePath}>
          TrustPay
        </Link>
        <p className="area-label">{area}</p>
        <nav aria-label={`${area} navigation`}>
          {items.map((item) => (
            <Link href={area === 'Customer' ? (customerPaths[item] ?? basePath) : basePath} key={item}>
              {item}
            </Link>
          ))}
        </nav>
      </aside>
      <section className="content">{children}</section>
    </main>
  );
}
