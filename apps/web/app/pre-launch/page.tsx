import Link from 'next/link';

export default function PreLaunchPage() {
  return (
    <main className="marketplace">
      <header className="market-header">
        <Link className="market-brand" href="/">
          <span>T</span> TrustPay
        </Link>
        <nav>
          <Link href="/marketplace">Marketplace</Link>
          <Link href="/">How TrustPay works</Link>
        </nav>
      </header>
      <section className="market-empty pre-launch">
        <span>◇</span>
        <strong>TrustPay protected transactions are currently in pre-launch.</strong>
        <p>
          Explore the TrustPay presentation and marketplace preview while production transaction
          services are being prepared.
        </p>
        <Link className="trust-cta" href="/marketplace">
          Explore marketplace <span>→</span>
        </Link>
      </section>
    </main>
  );
}
