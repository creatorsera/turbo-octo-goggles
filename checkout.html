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

  // Inline validation on blur (text inputs only)
  ['name','phone','address','city'].forEach(id => {
    const el = form.elements[id];
    if (!el) return;
    el.addEventListener('blur',  () => validateTextField(el));
    el.addEventListener('input', () => clearFieldError(el.id, el));
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
        name:    form.elements['name'].value.trim(),
        phone:   form.elements['phone'].value.trim(),
        address: form.elements['address'].value.trim(),
        city:    form.elements['city'].value.trim(),
        payment: form.elements['payment'].value,
        notes:   form.elements['notes'] ? form.elements['notes'].value.trim() : '',
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

      localStorage.removeItem('dynamic_store_cart_v2');
      updateCartBadge();

      if (res.wa_url) {
        window.location.href = res.wa_url;
      } else {
        toast("Order placed! We'll contact you shortly.", 'success');
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

function validateTextField(el) {
  if (!el) return true;
  const errorEl = document.getElementById(el.id + 'Error');
  let msg = '';

  if (!el.value.trim()) {
    msg = 'This field is required.';
  } else if (el.type === 'tel' && !/^[\d\s\+\-]{10,15}$/.test(el.value)) {
    msg = 'Enter a valid phone number.';
  }

  if (msg) {
    el.classList.add('error');
    if (errorEl) { errorEl.textContent = msg; errorEl.classList.add('visible'); }
    return false;
  }
  clearFieldError(el.id, el);
  return true;
}

function clearFieldError(id, el) {
  if (el) el.classList.remove('error');
  const errorEl = document.getElementById(id + 'Error');
  if (errorEl) errorEl.classList.remove('visible');
}

function validateForm(form) {
  let valid = true;

  // Text fields
  ['name','phone','address','city'].forEach(id => {
    const el = form.elements[id];
    if (el && !validateTextField(el)) valid = false;
  });

  // Payment radio group
  const paymentVal = form.elements['payment'].value;
  const paymentErr = document.getElementById('paymentError');
  if (!paymentVal) {
    if (paymentErr) { paymentErr.textContent = 'Please select a payment method.'; paymentErr.classList.add('visible'); }
    valid = false;
  } else {
    if (paymentErr) paymentErr.classList.remove('visible');
  }

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
          ${[i.color, i.size, 'Qty: ' + i.qty].filter(Boolean).join(' · ')}
        </div>
        <div class="checkout-summary__item-price">${fmt(i.price * i.qty)}</div>
      </div>
    </div>
  `).join('');

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  if (totalEl) totalEl.textContent = fmt(total);
}
