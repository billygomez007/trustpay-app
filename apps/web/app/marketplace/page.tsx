'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listPublicSellers, type PublicSeller } from '../components/api';

export default function MarketplacePage() {
  const [sellers, setSellers] = useState<PublicSeller[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    listPublicSellers(search)
      .then((value) => active && setSellers(value))
      .catch(() => active && setSellers([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [search]);
  return (
    <main className="marketplace">
      <header className="market-header">
        <Link className="market-brand" href="/marketplace">
          <span>T</span> TrustPay
        </Link>
        <nav>
          <Link href="#categories">Categories</Link>
          <Link href="#how-it-works">How it works</Link>
          <Link href="/sign-in?next=%2Fportal">My transactions</Link>
          <Link href="/pre-launch">Become a seller</Link>
          <Link className="market-signin" href="/sign-in">
            Sign in
          </Link>
        </nav>
      </header>
      <section className="market-hero">
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
        <span className="market-eyebrow">Protected commerce in Ghana & Africa</span>
        <h1>
          Trade online
          <br />
          <em>with confidence.</em>
        </h1>
        <p>
          TrustPay is preparing protected transactions for launch. Explore the marketplace
          experience and TrustPay’s approach to safer commerce.
        </p>
        <div className="hero-actions">
          <Link className="hero-primary" href="/pre-launch">
            Start buying <span>→</span>
          </Link>
          <Link className="hero-secondary" href="/pre-launch">
            Start selling <span>↗</span>
          </Link>
        </div>
        <div className="market-search">
          <span>⌕</span>
          <input
            aria-label="Search trusted sellers"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search verified sellers"
          />
        </div>
      </section>
      <section className="trust-strip" id="how-it-works">
        <div>
          <span className="trust-number">01</span>
          <strong>Choose with clarity</strong>
          <span>See public Trust Profiles when sellers opt in.</span>
        </div>
        <div>
          <span className="trust-number">02</span>
          <strong>Prepare with protection</strong>
          <span>Protected transaction capabilities are being prepared for launch.</span>
        </div>
        <div>
          <span className="trust-number">03</span>
          <strong>Transact with confidence</strong>
          <span>Clear terms and trusted records are central to the TrustPay approach.</span>
        </div>
      </section>
      <section className="category-section" id="categories">
        <div className="section-title">
          <div>
            <span className="market-eyebrow">EXPLORE COMMERCE</span>
            <h2>Find what you need</h2>
          </div>
          <span className="result-count">Marketplace preview</span>
        </div>
        <div className="category-grid">
          {[
            'Electronics',
            'Fashion',
            'Vehicles',
            'Property',
            'Services',
            'Digital products',
            'Business equipment'
          ].map((category, index) => (
            <div className={`category-card category-${index}`} key={category}>
              <span>{['◈', '✦', '□', '⌂', '✳', '◇', '▦'][index]}</span>
              <strong>{category}</strong>
              <small>Coming soon</small>
            </div>
          ))}
        </div>
      </section>
      <section className="seller-section">
        <div className="section-title">
          <div>
            <span className="market-eyebrow">THE TRUSTED NETWORK</span>
            <h2>Featured sellers</h2>
          </div>
          <span className="result-count">
            {loading ? 'Loading…' : `${sellers.length} public profiles`}
          </span>
        </div>
        <div className="seller-grid">
          {sellers.map((seller) => (
            <article className="seller-card" key={seller.id}>
              <div className="seller-card-top">
                <div className="seller-avatar">{seller.displayName.slice(0, 1).toUpperCase()}</div>
                <span className="verified-badge">
                  ✓ {seller.verificationLevel.replaceAll('_', ' ')}
                </span>
              </div>
              <h3>{seller.displayName}</h3>
              <p className="seller-location">
                {seller.country || 'Ghana'} · Member since{' '}
                {new Date(seller.memberSince).getFullYear()}
              </p>
              <div className="seller-stats">
                <div>
                  <strong>{seller.trustScore}</strong>
                  <span>Trust score</span>
                </div>
                <div>
                  <strong>{seller.completedDeals}</strong>
                  <span>Completed</span>
                </div>
                <div>
                  <strong>{seller.averageRating || '—'}</strong>
                  <span>Rating</span>
                </div>
              </div>
              <Link href={`/marketplace/sellers/${seller.id}`} className="seller-link">
                View storefront <span>→</span>
              </Link>
            </article>
          ))}
          {!loading && !sellers.length && (
            <div className="market-empty">
              <strong>Marketplace listings will appear here</strong>
              <span>
                Public Trust Profiles and listings will appear here when the marketplace service is
                available.
              </span>
            </div>
          )}
        </div>
      </section>
      <section className="market-footer-band">
        <div>
          <span className="market-eyebrow">BUILT FOR TRUST</span>
          <h2>
            Commerce should feel
            <br />
            <em>safer by default.</em>
          </h2>
        </div>
        <p>TrustPay is preparing clear transaction records and protected workflows for launch.</p>
      </section>
    </main>
  );
}
