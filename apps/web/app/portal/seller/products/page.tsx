'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createProduct, listSellerProducts, type Product } from '../../../components/api';

export default function SellerProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    currency: 'GHS',
    location: '',
    status: 'draft' as 'draft' | 'published'
  });
  useEffect(() => {
    void listSellerProducts()
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const product = await createProduct(form);
      setProducts((current) => [product, ...current]);
      setForm({
        title: '',
        description: '',
        price: '',
        currency: 'GHS',
        location: '',
        status: 'draft'
      });
      setOpen(false);
      setMessage('Listing saved.');
    } catch {
      setMessage('Listing could not be saved. Sign in as the seller account.');
    }
  };
  return (
    <main className="customer-page">
      <header className="customer-header">
        <Link href="/portal/seller">← Seller desk</Link>
        <span>Store management</span>
        <Link className="header-action" href="/marketplace">
          Preview marketplace
        </Link>
      </header>
      <section className="customer-intro">
        <span className="market-eyebrow">YOUR COMMERCE CATALOG</span>
        <h1>Products & services</h1>
        <p>
          Publish what you offer. TrustPay keeps order and payment protection separate from your
          listing.
        </p>
        <button className="header-action product-add" onClick={() => setOpen((value) => !value)}>
          + Add listing
        </button>
      </section>
      {open && (
        <form className="product-form" onSubmit={submit}>
          <span className="market-eyebrow">NEW LISTING</span>
          <input
            required
            placeholder="Product or service name"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
          <textarea
            required
            placeholder="Describe what buyers receive"
            rows={4}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
          <div className="form-split">
            <input
              required
              placeholder="Price"
              inputMode="decimal"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
            />
            <input
              placeholder="Location"
              value={form.location}
              onChange={(event) => setForm({ ...form, location: event.target.value })}
            />
          </div>
          <label className="publish-toggle">
            <input
              type="checkbox"
              checked={form.status === 'published'}
              onChange={(event) =>
                setForm({ ...form, status: event.target.checked ? 'published' : 'draft' })
              }
            />{' '}
            Publish to marketplace
          </label>
          <button type="submit">Save listing</button>
          {message && <small>{message}</small>}
        </form>
      )}
      <section className="seller-products">
        <div className="section-title">
          <div>
            <span className="market-eyebrow">LISTINGS</span>
            <h2>Your catalog</h2>
          </div>
          <span className="result-count">{products.length} listings</span>
        </div>
        <div className="seller-product-grid">
          {products.map((product) => (
            <article className="seller-product-card" key={product.id}>
              <span className={`listing-status ${product.status}`}>{product.status}</span>
              <h3>{product.title}</h3>
              <p>{product.description}</p>
              <strong>
                {product.price} {product.currency}
              </strong>
              <span>{product.location || 'Location not set'}</span>
            </article>
          ))}
          {!products.length && (
            <div className="customer-empty">
              <strong>No listings yet</strong>
              <span>Create a product or service to begin your catalog.</span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
