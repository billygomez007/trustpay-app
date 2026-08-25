'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  createOrder,
  getProduct,
  prepareOrderPayment,
  type Product
} from '../../../components/api';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
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
  const buy = async () => {
    setMessage('Creating your protected order…');
    try {
      const order = await createOrder(product.id);
      await prepareOrderPayment(order.id, 'paystack');
      router.push(`/portal/deals/${order.dealId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Paystack is not configured.';
      setMessage(message);
    }
  };
  return (
    <main className="product-page">
      <header className="market-header">
        <Link className="market-brand" href="/marketplace">
          <span>T</span> TrustPay
        </Link>
        <nav>
          <Link href="/marketplace">Marketplace</Link>
          <Link href="/portal">My transactions</Link>
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
            <span>Protected by TrustPay escrow</span>
          </div>
          <button className="buy-button" onClick={buy}>
            Buy with TrustPay protection <span>→</span>
          </button>
          {message && <p className="product-message">{message}</p>}
          <div className="buyer-protection">
            <span>✓</span>
            <div>
              <strong>Your payment is protected</strong>
              <p>Funds are released only after successful completion of the transaction.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
