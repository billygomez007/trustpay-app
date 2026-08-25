'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getProduct, type Product } from '../../../components/api';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    void params
      .then(({ id }) => getProduct(id))
      .then(setProduct)
      .catch(() => setMessage('This listing is no longer available.'));
  }, [params]);
  if (!product)
    return (
      <main className="marketplace">
        <header className="market-header">
          <Link className="market-brand" href="/marketplace">
            <span>T</span> TrustPay
          </Link>
        </header>
        <div className="market-empty">{message || 'Loading listing…'}</div>
      </main>
    );
  return (
    <main className="product-page">
      <header className="market-header">
        <Link className="market-brand" href="/marketplace">
          <span>T</span> TrustPay
        </Link>
        <nav>
          <Link href="/marketplace">Marketplace</Link>
          <Link href="/sign-in?next=%2Fportal">My transactions</Link>
          <Link className="market-signin" href="/sign-in">
            Sign in
          </Link>
        </nav>
      </header>
      <div className="product-layout">
        <section className="product-visual">
          <div className="product-placeholder">
            {product.images?.[0] ? (
              <img src={product.images[0]} alt={product.title} />
            ) : (
              <span>◇</span>
            )}
          </div>
          <span className="image-note">
            {product.images?.length
              ? `${product.images.length} listing images`
              : 'Seller has not added images yet'}
          </span>
        </section>
        <section className="product-info">
          <span className="market-eyebrow">{product.category?.name || 'TrustPay listing'}</span>
          <h1>{product.title}</h1>
          <div className="product-seller">
            <div className="seller-avatar">{product.seller.name.slice(0, 1).toUpperCase()}</div>
            <div>
              <strong>{product.seller.name}</strong>
              <span>
                {product.location || 'Ghana'} ·{' '}
                <b>✓ {product.seller.verificationLevel.replaceAll('_', ' ')}</b>
              </span>
            </div>
            <Link href={`/marketplace/sellers/${product.seller.id}`}>View seller →</Link>
          </div>
          <p className="product-description">{product.description}</p>
          <div className="product-price">
            <strong>
              {product.price} {product.currency}
            </strong>
            <span>Protected payments are currently in pre-launch</span>
          </div>
          <Link className="buy-button" href="/pre-launch">
            Protected payments are in pre-launch <span>→</span>
          </Link>
          <div className="buyer-protection">
            <span>✓</span>
            <div>
              <strong>How protected payments work</strong>
              <p>
                When available, funds are held until the agreed conditions are met or a dispute is
                resolved.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
