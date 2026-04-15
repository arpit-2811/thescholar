// ===== BACKEND API BASE URL ============================
// Update this once you deploy to Render.com
const API_BASE = 'https://thescholars-api.onrender.com';

// ===== NAVBAR SCROLL EFFECT =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 60) navbar.classList.add('scrolled');
  else navbar.classList.remove('scrolled');
});

// ===== HAMBURGER MENU =====
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    const spans = hamburger.querySelectorAll('span');
    navLinks.classList.contains('open')
      ? (spans[0].style.cssText='transform:rotate(45deg) translateY(7px); background:#0f2447',
         spans[1].style.opacity='0',
         spans[2].style.cssText='transform:rotate(-45deg) translateY(-7px); background:#0f2447')
      : (spans.forEach(s => s.style.cssText='background:#0f2447'));
  });
  // Close on link click
  navLinks.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.querySelectorAll('span').forEach(s => s.style.cssText='');
    })
  );
}

// ===== FLOATING PARTICLES (hero only) =====
const particleContainer = document.getElementById('particles');
if (particleContainer) {
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 8 + 3;
    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${Math.random() * 100}%;
      animation-duration: ${Math.random() * 14 + 10}s;
      animation-delay: ${Math.random() * 8}s;
      opacity: ${Math.random() * 0.4 + 0.1};
    `;
    particleContainer.appendChild(p);
  }
}

// ===== INTERSECTION OBSERVER – animate on scroll =====
const observerOptions = { threshold: 0.12, rootMargin: '0px 0px -40px 0px' };
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

// Apply to cards & feature items on load
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.animate-card, .feature-item, .highlight-item, .sidebar-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
});

// ===== COURSE CARDS STAGGER =====
document.querySelectorAll('.course-card').forEach((card, i) => {
  card.style.transitionDelay = `${i * 0.08}s`;
});
document.querySelectorAll('.feature-item').forEach((item, i) => {
  item.style.transitionDelay = `${i * 0.06}s`;
});

// ===== STAT NUMBER COUNTER ANIMATION =====
function animateCounter(el) {
  const target   = parseInt(el.dataset.target, 10);
  const suffix   = el.dataset.suffix || '';
  const dur      = 1600;
  const step     = 16;
  const steps    = dur / step;
  const inc      = target / steps;
  let cur = 0;
  const timer = setInterval(() => {
    cur += inc;
    if (cur >= target) { cur = target; clearInterval(timer); }
    el.textContent = Math.floor(cur) + suffix;
  }, step);
}

const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      animateCounter(e.target);
      statObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-num[data-target]').forEach(el => statObserver.observe(el));

// ===== ACTIVE NAV LINK on scroll =====
const sections = document.querySelectorAll('section[id]');
window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(sec => {
    if (window.scrollY >= sec.offsetTop - 120) current = sec.getAttribute('id');
  });
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.remove('active');
    if (a.getAttribute('href') === `#${current}` || a.getAttribute('href') === `index.html#${current}`)
      a.classList.add('active');
  });
});

// ===== ENQUIRY FORM SUBMISSION (fetch → backend API) =====
const enquiryForm = document.getElementById('enquiryForm');
const successMsg  = document.getElementById('successMsg');
const submitBtn   = document.getElementById('submitBtn');
const submitBtnText = document.getElementById('submitBtnText');

if (enquiryForm) {
  enquiryForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // ── Basic validation ────────────────────────────────
    const required = enquiryForm.querySelectorAll('[required]');
    let valid = true;
    required.forEach(field => {
      field.style.borderColor = '';
      field.style.boxShadow   = '';
      if (!field.value.trim()) {
        field.style.borderColor = '#e53e3e';
        field.style.boxShadow   = '0 0 0 3px rgba(229,62,62,0.15)';
        valid = false;
      }
    });
    if (!valid) {
      enquiryForm.querySelector('[required][style*="e53e3e"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      enquiryForm.querySelector('[required][style*="e53e3e"]')?.focus();
      return;
    }

    // ── Loading state ───────────────────────────────────
    submitBtn.disabled = true;
    if (submitBtnText) submitBtnText.textContent = 'Sending…';

    // ── Collect form data ───────────────────────────────
    const data = Object.fromEntries(new FormData(enquiryForm));

    // ── POST to backend API ─────────────────────────────
    try {
      const res = await fetch(`${API_BASE}/api/enquiries`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Submission failed');
      }

      // ── Success ─────────────────────────────────────
      enquiryForm.reset();
      if (successMsg) {
        successMsg.classList.add('show');
        successMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

    } catch (err) {
      // ── Error (show to user) ─────────────────────────
      alert('⚠️ Could not submit enquiry: ' + (err.message || 'Server error. Please call us directly.'));
    } finally {
      submitBtn.disabled = false;
      if (submitBtnText) submitBtnText.textContent = 'Submit Enquiry';
    }
  });

  // Clear error styles on input
  enquiryForm.querySelectorAll('input, select, textarea').forEach(field => {
    field.addEventListener('input', () => {
      field.style.borderColor = '';
      field.style.boxShadow   = '';
    });
  });
}

// ===== SMOOTH SCROLL for anchor links =====
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
  });
});

// ===== Active nav link style =====
const style = document.createElement('style');
style.textContent = `
  .nav-links a.active {
    color: var(--navy, #0f2447) !important;
    background: rgba(35,86,168,0.08) !important;
    border-bottom: 2px solid #d4af37;
    border-radius: 0 !important;
    font-weight: 700 !important;
  }
`;
document.head.appendChild(style);
