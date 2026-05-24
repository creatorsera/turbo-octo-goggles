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
