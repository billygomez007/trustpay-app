import Link from 'next/link';

const useCases = [
  {
    title: 'Commerce',
    copy: 'Buy and sell with confidence.',
    examples: [
      'Online purchases',
      'Marketplace transactions',
      'Wholesale deals',
      'High-value purchases'
    ]
  },
  {
    title: 'Property',
    copy: 'Protect deposits and property agreements.',
    examples: [
      'Rental caution deposits',
      'Advance payments',
      'Tenant-landlord agreements',
      'Property-related transactions'
    ]
  },
  {
    title: 'Services',
    copy: 'Secure payments between clients and service providers.',
    examples: ['Contractors', 'Freelancers', 'Agencies', 'Professional services']
  },
  {
    title: 'Assets & rentals',
    copy: 'Protect deposits when renting valuable assets.',
    examples: ['Equipment rental', 'Machinery', 'Vehicle rental', 'Event equipment']
  },
  {
    title: 'Business agreements',
    copy: 'Create trusted transactions between businesses.',
    examples: ['Supplier payments', 'Purchase agreements', 'Partnerships', 'B2B transactions']
  },
  {
    title: 'Custom transactions',
    copy: 'Set clear terms for agreements that do not fit a standard category.',
    examples: ['Custom deposits', 'Milestone work', 'Shared assets', 'One-off agreements']
  }
];

const steps = [
  {
    number: '01',
    title: 'Agree on the transaction',
    copy: 'Both parties define what is being exchanged and the conditions.'
  },
  {
    number: '02',
    title: 'Prepare a protected transaction',
    copy: 'Both parties record the terms while protected payment capability is being prepared for launch.'
  },
  {
    number: '03',
    title: 'Complete the agreement',
    copy: 'Goods are delivered, services are completed, or deposits are resolved.'
  },
  {
    number: '04',
    title: 'Release under agreed terms',
    copy: 'When protected payments are available, funds can be released according to the agreed conditions.'
  }
];

const securityPoints = [
  'Clear transaction terms',
  'Protected payment capability in pre-launch',
  'Verified identities or sellers where available',
  'Transaction records',
  'Dispute support',
  'Transparent status tracking'
];

export default function HomePage() {
  return (
    <main className="home-page">
      <header className="market-header home-header">
        <Link className="market-brand" href="/">
          <span>T</span> TrustPay
        </Link>
        <nav aria-label="Primary">
          <Link href="#how-it-works">How it works</Link>
          <Link href="#use-cases">Use cases</Link>
          <Link href="/marketplace">Marketplace</Link>
          <Link href="#businesses">For businesses</Link>
          <Link href="#trust-security">Trust & security</Link>
          <Link className="market-signin" href="/sign-in">
            Sign in
          </Link>
        </nav>
      </header>

      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="home-eyebrow">Protected transaction infrastructure</span>
          <h1>TrustPay protects every transaction where trust matters.</h1>
          <p>
            Whether you are buying a product, paying a deposit, renting property, hiring a service,
            or entering an agreement, TrustPay helps both parties transact with confidence.
          </p>
          <div className="home-actions">
            <Link className="hero-primary" href="/sign-in?next=%2Fportal%2Fdeals%2Fcreate">
              Start a Protected Transaction <span>→</span>
            </Link>
            <Link className="hero-secondary" href="#how-it-works">
              Explore How TrustPay Works <span>↓</span>
            </Link>
          </div>
        </div>
        <aside className="home-hero-panel" aria-label="TrustPay platform overview">
          <span className="home-panel-label">TrustPay platform</span>
          <strong>One platform. Multiple protected transaction use cases.</strong>
          <div className="home-hierarchy" aria-hidden="true">
            <div>TrustPay Platform</div>
            <div>Protected Transaction Infrastructure</div>
            <div>Commerce · Property · Services · Rentals · Business Agreements</div>
            <div>Marketplace is one use case</div>
          </div>
        </aside>
      </section>

      <section className="home-section" id="use-cases">
        <div className="section-title home-section-title">
          <div>
            <span className="market-eyebrow">Use cases</span>
            <h2>One platform. Every type of transaction.</h2>
          </div>
        </div>
        <div className="use-case-grid">
          {useCases.map((useCase) => (
            <article className="use-case-card" key={useCase.title}>
              <span className="use-case-kicker">{useCase.title}</span>
              <h3>{useCase.copy}</h3>
              <ul>
                {useCase.examples.map((example) => (
                  <li key={example}>{example}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section" id="how-it-works">
        <div className="section-title home-section-title">
          <div>
            <span className="market-eyebrow">How it works</span>
            <h2>How TrustPay protects a transaction.</h2>
          </div>
        </div>
        <div className="step-grid">
          {steps.map((step) => (
            <article className="step-card" key={step.number}>
              <span className="step-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section home-marketplace" id="marketplace">
        <div>
          <span className="market-eyebrow">Marketplace</span>
          <h2>Shop through the TrustPay Marketplace.</h2>
          <p>
            Explore the Marketplace and public Trust Profiles. The Marketplace is one way people
            and businesses can use the TrustPay platform.
          </p>
        </div>
        <Link className="trust-cta home-inline-cta" href="/marketplace">
          Explore Marketplace <span>→</span>
        </Link>
      </section>

      <section className="home-section" id="businesses">
        <div className="section-title home-section-title">
          <div>
            <span className="market-eyebrow">For businesses</span>
            <h2>Built for supplier payments, procurement, and B2B agreements.</h2>
          </div>
        </div>
        <div className="home-business-grid">
          <article className="home-note-card">
            <strong>Supplier transactions</strong>
            <p>Protect commercial agreements between businesses before money changes hands.</p>
          </article>
          <article className="home-note-card">
            <strong>Milestone agreements</strong>
            <p>Support staged service delivery, project work, and milestone-based payments.</p>
          </article>
          <article className="home-note-card">
            <strong>High-value transactions</strong>
            <p>Use TrustPay when the cost of a mistake is high and clarity matters.</p>
          </article>
        </div>
      </section>

      <section className="home-section home-security" id="trust-security">
        <div>
          <span className="market-eyebrow">Trust & security</span>
          <h2>Protection built into the transaction.</h2>
          <p>
            TrustPay helps parties agree clear terms and keep a shared transaction record. When
            protected payments are available, funds are released only when the agreed conditions are
            met. If something needs review, both parties can use the dispute process.
          </p>
        </div>
        <ul className="security-list">
          {securityPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
