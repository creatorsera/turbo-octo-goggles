/* ============================================================
   DYNAMIC STORE — cart.js
   Cart state management (localStorage) 
   ============================================================ */

// cart state functions are in data.js (getCart, addToCart, etc.)
// this file handles cart.html rendering

document.addEventListener('DOMContentLoaded', () => {
  renderCart();
});

function renderCart() {
  const items = cartItems();
  const container = document.getElementById('cartItems');
  const emptyState = document.getElementById('cartEmpty');
  const summaryWrap = document.getElementById('cartSummary');
  const checkoutBtn = document.getElementById('checkoutBtn');

  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    if (summaryWrap) summaryWrap.style.display = 'none';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (summaryWrap) summaryWrap.style.display = '';

  container.innerHTML = items.map(item => `
    <div class="cart-item" data-key="${item.key}">
      <div class="cart-item__img-wrap">
        ${item.image
          ? `<img src="${item.image}" alt="${item.name}" loading="lazy" class="cart-item__img">`
          : `<div class="cart-item__img-placeholder">
               <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                 <rect x="3" y="3" width="18" height="18" rx="2"/><path d="m3 9 4-4 4 4 4-4 4 4"/>
               </svg>
             </div>`
        }
      </div>
      <div class="cart-item__body">
        <a href="product.html?id=${item.productId}" class="cart-item__name">${item.name}</a>
        <div class="cart-item__variants">
          ${item.color ? `<span class="cart-item__tag">${item.color}</span>` : ''}
          ${item.size  ? `<span class="cart-item__tag">${item.size}</span>` : ''}
          ${item.qty > 1 ? `<span class="cart-item__tag">Qty: ${item.qty}</span>` : ''}
        </div>
        <div class="cart-item__footer">
          <span class="cart-item__price">${fmt(item.price * item.qty)}</span>
          <button class="cart-item__remove" data-key="${item.key}" aria-label="Remove ${item.name}">
            Remove
          </button>
        </div>
      </div>
    </div>
  `).join('');

  // Remove buttons
  container.querySelectorAll('.cart-item__remove').forEach(btn => {
    btn.addEventListener('click', () => {
      removeFromCart(btn.dataset.key);
      renderCart();
      toast('Item removed', 'info');
    });
  });

  // Update summary
  renderSummary(items);
}

function renderSummary(items) {
  const itemsEl = document.getElementById('summaryItems');
  const totalEl = document.getElementById('summaryTotal');
  const countEl = document.getElementById('summaryCount');

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  if (itemsEl) {
    itemsEl.innerHTML = items.map(i => `
      <div class="cart-summary__row">
        <span class="cart-summary__label">${i.name} ${i.color ? `(${i.color}` : ''}${i.size ? `, ${i.size})` : (i.color ? ')' : '')} × ${i.qty}</span>
        <span class="cart-summary__val">${fmt(i.price * i.qty)}</span>
      </div>
    `).join('');
  }
  if (totalEl) totalEl.textContent = fmt(total);
  if (countEl) countEl.textContent = `${count} item${count !== 1 ? 's' : ''}`;
}

/* ============================================================
   DYNAMIC STORE — checkout.js
   Form validation + order placement + WhatsApp redirect
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initCheckout();
});

function initCheckout() {
  renderOrderSummary();

  const form = document.getElementById('checkoutForm');
  if (!form) return;

  // Inline validation on blur
  form.querySelectorAll('[required]').forEach(field => {
    field.addEventListener('blur', () => validateField(field));
    field.addEventListener('input', () => clearError(field));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm(form)) return;

    const btn = document.getElementById('placeOrderBtn');
    btn.classList.add('btn--loading');
    btn.textContent = '';
    btn.disabled = true;

    try {
      const items = cartItems();
      if (!items.length) { toast('Your bag is empty.', 'error'); return; }

      const data = {
        name:     form.name.value.trim(),
        phone:    form.phone.value.trim(),
        address:  form.address.value.trim(),
        city:     form.city.value.trim(),
        payment:  form.payment.value,
        notes:    form.notes?.value.trim() || '',
        items: items.map(i => ({
          product_id:   i.productId,
          product_name: i.name,
          price:        i.price,
          quantity:     i.qty,
          color:        i.color || '',
          size:         i.size  || '',
        })),
      };

      const res = await placeOrder(data);

      // Clear cart
      localStorage.removeItem('dynamic_store_cart_v2');
      updateCartBadge();

      // Redirect to WhatsApp
      if (res.wa_url) {
        window.location.href = res.wa_url;
      } else {
        toast('Order placed! We\'ll contact you shortly.', 'success');
        setTimeout(() => window.location.href = 'index.html', 2500);
      }

    } catch (err) {
      toast(err.message || 'Could not place order. Please try again.', 'error');
      btn.classList.remove('btn--loading');
      btn.disabled = false;
      btn.textContent = 'Place Order via WhatsApp';
    }
  });
}

function validateField(field) {
  const errorEl = document.getElementById(`${field.id}Error`);
  let msg = '';

  if (field.required && !field.value.trim()) {
    msg = 'This field is required.';
  } else if (field.type === 'tel' && field.value && !/^[\d\s\+\-]{10,15}$/.test(field.value)) {
    msg = 'Enter a valid phone number.';
  } else if (field.name === 'payment' && !field.value) {
    msg = 'Please select a payment method.';
  }

  if (msg) {
    field.classList.add('error');
    if (errorEl) { errorEl.textContent = msg; errorEl.classList.add('visible'); }
    return false;
  }
  clearError(field);
  return true;
}

function clearError(field) {
  field.classList.remove('error');
  const errorEl = document.getElementById(`${field.id}Error`);
  if (errorEl) errorEl.classList.remove('visible');
}

function validateForm(form) {
  let valid = true;
  form.querySelectorAll('[required]').forEach(field => {
    if (!validateField(field)) valid = false;
  });
  return valid;
}

function renderOrderSummary() {
  const items = cartItems();
  const container = document.getElementById('checkoutItems');
  const totalEl   = document.getElementById('checkoutTotal');

  if (!container) return;

  if (!items.length) {
    container.innerHTML = '<p style="font-size:0.85rem;color:var(--gray)">Your bag is empty.</p>';
    return;
  }

  container.innerHTML = items.map(i => `
    <div class="checkout-summary__item">
      <div class="checkout-summary__img">
        ${i.image
          ? `<img src="${i.image}" alt="${i.name}" loading="lazy">`
          : `<div style="width:100%;height:100%;background:var(--cream-dark)"></div>`
        }
      </div>
      <div>
        <div class="checkout-summary__item-name">${i.name}</div>
        <div class="checkout-summary__item-meta">
          ${[i.color, i.size, `Qty: ${i.qty}`].filter(Boolean).join(' · ')}
        </div>
        <div class="checkout-summary__item-price">${fmt(i.price * i.qty)}</div>
      </div>
    </div>
  `).join('');

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  if (totalEl) totalEl.textContent = fmt(total);
}

/* ============================================================
   DYNAMIC STORE — data.js
   Config + API helpers + shared utilities
   ============================================================ */

const CONFIG = {
  API_BASE: 'https://dynamic-store-backend.vercel.app/api',
  STORE_NAME: 'Dynamic Store',
  CURRENCY: 'Rs.',
};

/* ── safe JSON parse for JSONB fields ─────────────────────── */
const safe = (val, fallback = []) => {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
};

/* alias expected by some existing code */
const parseList = safe;

/* ── Price helpers ──────────────────────────────────────────── */
const fmt = (n) => `${CONFIG.CURRENCY} ${Number(n || 0).toLocaleString('en-PK')}`;

function calcPrice(product, color, size) {
  const variants = safe(product.variants);
  const sizes    = safe(product.sizes);
  const variant  = variants.find(v => v.color === color) || variants[0] || {};
  const sizeObj  = sizes.find(s => s.name === size) || {};
  const sizePrices = safe(variant.size_prices, {});
  return (
    (product.base_price || 0) +
    (variant.price_adj || 0) +
    (sizePrices[size] || 0) +
    (sizeObj.price_adj || 0)
  );
}

/* ── API ─────────────────────────────────────────────────────── */
async function apiFetch(path, options = {}) {
  const res = await fetch(`${CONFIG.API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function getProducts() { return apiFetch('/products'); }
async function getProduct(id) { return apiFetch(`/products/${id}`); }
async function placeOrder(data) {
  return apiFetch('/orders', { method: 'POST', body: JSON.stringify(data) });
}

/* ── Cart ────────────────────────────────────────────────────── */
const CART_KEY = 'dynamic_store_cart_v2';

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; }
  catch { return {}; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function cartKey(productId, color, size) {
  return `${productId}__${color}__${size}`;
}

function addToCart(product, color, size, qty = 1) {
  const cart = getCart();
  const key  = cartKey(product.id, color, size);
  const price = calcPrice(product, color, size);
  if (cart[key]) {
    cart[key].qty += qty;
  } else {
    cart[key] = {
      productId: product.id,
      name: product.name,
      color, size, qty,
      price,
      image: getProductImage(product, color),
    };
  }
  saveCart(cart);
}

function removeFromCart(key) {
  const cart = getCart();
  delete cart[key];
  saveCart(cart);
}

function cartItems() {
  return Object.entries(getCart()).map(([key, item]) => ({ key, ...item }));
}

function cartTotal() {
  return cartItems().reduce((sum, i) => sum + i.price * i.qty, 0);
}

function cartCount() {
  return cartItems().reduce((sum, i) => sum + i.qty, 0);
}

function updateCartBadge() {
  const count = cartCount();
  document.querySelectorAll('.nav__cart-count').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

/* ── Product helpers ────────────────────────────────────────── */
function getProductImage(product, color) {
  const variants = safe(product.variants);
  const variant  = variants.find(v => v.color === color);
  return variant?.image_url || product.image_url || '';
}

function getStartPrice(product) {
  const variants = safe(product.variants);
  if (!variants.length) return product.base_price;
  const adjs = variants.map(v => v.price_adj || 0);
  return product.base_price + Math.min(...adjs);
}

/* ── Nav: scroll effect + hamburger ────────────────────────── */
function initNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  // Scroll shadow
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Cart badge
  updateCartBadge();

  // Hamburger
  const ham = document.querySelector('.nav__hamburger');
  const menu = document.querySelector('.nav__menu');
  if (ham && menu) {
    ham.addEventListener('click', () => {
      const open = ham.classList.toggle('open');
      menu.classList.toggle('open', open);
      ham.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    // Close on link click
    menu.querySelectorAll('.nav__menu-link').forEach(a =>
      a.addEventListener('click', () => {
        ham.classList.remove('open');
        menu.classList.remove('open');
        document.body.style.overflow = '';
      })
    );
  }

  // Hide page loader
  const loader = document.getElementById('pageLoader');
  if (loader) {
    window.addEventListener('load', () => setTimeout(() => loader.classList.add('hidden'), 300));
  }
}

/* ── Toast ──────────────────────────────────────────────────── */
function toast(msg, type = 'success', duration = 3000) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  // Icon
  const icons = {
    success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>`,
    error:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>`,
    info:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
  };
  el.innerHTML = `${icons[type] || ''}${msg}`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('removing');
    el.addEventListener('animationend', () => el.remove());
  }, duration);
}

document.addEventListener('DOMContentLoaded', initNav);
