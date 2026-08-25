import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'TrustPay | Protected Transaction Infrastructure',
  description:
    'TrustPay protects transactions where trust matters across commerce, property, services, rentals, and business agreements.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
