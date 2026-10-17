import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, ShoppingCart, ArrowRight, Package } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import './dashboard.css';

const CartPage = ({ setActiveTab }) => {
  const navigate = useNavigate();
  const { cartItems, updateQty, clearCart } = useCart();
  const go = (tab, path) => (setActiveTab ? setActiveTab(tab) : navigate(path));

  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const delivery = cartItems.length > 0 ? 3.99 : 0;
  const total = subtotal + delivery;

  return (
    <>
      <div className="page-header">
        <h1>Cart</h1>
        <p>Add or remove items and manage quantities before checkout.</p>
      </div>

      {cartItems.length === 0 ? (
        <div className="dash-panel empty-state">
          <ShoppingCart size={56} />
          <p style={{ marginTop: '1rem', fontSize: '1.05rem' }}>Your cart is empty.</p>
          <button className="dash-btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => go('menu', '/customer/dashboard?tab=menu')}>Browse Menu</button>
        </div>
      ) : (
        <div className="dash-grid-sidebar">
          <div className="dash-panel" style={{ marginBottom: 0 }}>
            <div className="dash-panel-header">
              <h3>Cart Items ({cartItems.length})</h3>
              <button style={{ color: 'var(--error)', fontSize: '0.82rem', background: 'none', border: 'none', cursor: 'pointer' }} onClick={clearCart}>Clear All</button>
            </div>

            {cartItems.map(item => (
              <div key={item.id} className="list-row" style={{ alignItems: 'center' }}>
                <div className="list-row-left">
                  <div style={{ width: 56, height: 56, borderRadius: 12, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Package size={28} color="var(--dash-accent)" />
                  </div>
                  <div>
                    <div className="list-row-title">{item.name}</div>
                    <div className="list-row-sub">${item.price.toFixed(2)} each</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button className="qty-btn qty-btn-minus" onClick={() => updateQty(item.id, -1)}>−</button>
                  <span style={{ color: 'var(--dash-text, #fff)', fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                  <button className="qty-btn qty-btn-plus" onClick={() => updateQty(item.id, 1)}>+</button>
                  <span style={{ color: 'var(--dash-accent)', fontWeight: 700, minWidth: 52, textAlign: 'right' }}>${(item.price * item.qty).toFixed(2)}</span>
                  <button onClick={() => updateQty(item.id, -item.qty)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '0.25rem' }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="dash-panel">
              <h3 style={{ color: 'var(--dash-text, #fff)', marginBottom: '1.5rem' }}>Order Summary</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--dash-muted, #8a8a8a)', fontSize: '0.9rem' }}>
                  <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--dash-muted, #8a8a8a)', fontSize: '0.9rem' }}>
                  <span>Delivery Fee</span><span>${delivery.toFixed(2)}</span>
                </div>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--dash-text, #fff)', fontWeight: 700, fontSize: '1.05rem' }}>
                  <span>Total</span><span>${total.toFixed(2)}</span>
                </div>
              </div>
              <button className="dash-btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} onClick={() => go('checkout', '/checkout')}>
                Proceed to Checkout <ArrowRight size={18} />
              </button>
              <button className="dash-btn-outline" style={{ width: '100%', marginTop: '0.75rem' }} onClick={() => go('menu', '/customer/dashboard?tab=menu')}>
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CartPage;
