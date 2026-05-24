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
