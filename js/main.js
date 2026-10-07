const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
const currentYear = document.getElementById('year');
const enquiryForm = document.getElementById('enquiryForm');
const enquiryStatus = document.getElementById('enquiryStatus');
const feedbackForm = document.getElementById('feedbackForm');
const feedbackStatus = document.getElementById('feedbackStatus');

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}

if (menuButton && nav) {
  menuButton.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      menuButton.setAttribute('aria-expanded', 'false');
    });
  });
}

const projectCards = document.querySelectorAll('.project-card');

projectCards.forEach((card) => {
  const selectButton = card.querySelector('.project-select');

  selectButton.addEventListener('click', () => {
    const shouldSelect = selectButton.getAttribute('aria-pressed') !== 'true';

    projectCards.forEach((otherCard) => {
      otherCard.classList.remove('is-selected');
      otherCard.querySelector('.project-select').setAttribute('aria-pressed', 'false');
      otherCard.querySelector('.project-select').textContent = 'Select project';
    });

    if (shouldSelect) {
      card.classList.add('is-selected');
      selectButton.setAttribute('aria-pressed', 'true');
      selectButton.textContent = 'Selected';
    }
  });
});

const projectFilters = document.querySelectorAll('.project-filter');
const projectFilterStatus = document.getElementById('projectFilterStatus');

projectFilters.forEach((filterButton) => {
  filterButton.addEventListener('click', () => {
    const category = filterButton.dataset.filter;
    let visibleCount = 0;

    projectFilters.forEach((button) => {
      const active = button === filterButton;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    projectCards.forEach((card) => {
      const categories = card.dataset.categories.split(' ');
      const visible = category === 'all' || categories.includes(category);
      card.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    if (projectFilterStatus) {
      projectFilterStatus.hidden = visibleCount > 0;
    }
  });
});

const revealGroups = [
  document.querySelectorAll('.section-heading'),
  document.querySelectorAll('.services-grid > *'),
  document.querySelectorAll('.student-timeline > *'),
  document.querySelectorAll('.project-grid > *'),
  document.querySelectorAll('.course-grid > *'),
  document.querySelectorAll('.why-grid > *'),
  document.querySelectorAll('.project-outcome')
];

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });

  revealGroups.forEach((group) => {
    group.forEach((element, index) => {
      element.classList.add('scroll-reveal');
      element.style.setProperty('--reveal-delay', `${Math.min(index * 75, 375)}ms`);
      revealObserver.observe(element);
    });
  });
}

const neuralCanvas = document.getElementById('neuralCanvas');
const canvasContext = neuralCanvas?.getContext('2d');

if (neuralCanvas && canvasContext) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const particles = [];
  let canvasWidth = 0;
  let canvasHeight = 0;
  let animationFrame = 0;

  const resizeNeuralCanvas = () => {
    const bounds = neuralCanvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvasWidth = bounds.width;
    canvasHeight = bounds.height;
    neuralCanvas.width = Math.round(canvasWidth * pixelRatio);
    neuralCanvas.height = Math.round(canvasHeight * pixelRatio);
    canvasContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const particleCount = Math.min(52, Math.max(24, Math.floor(canvasWidth / 25)));
    particles.length = 0;
    for (let index = 0; index < particleCount; index += 1) {
      particles.push({
        x: Math.random() * canvasWidth,
        y: Math.random() * canvasHeight,
        radius: Math.random() * 1.7 + 0.8,
        dx: (Math.random() - 0.5) * 0.34,
        dy: (Math.random() - 0.5) * 0.34
      });
    }
  };

  const drawNeuralNetwork = () => {
    canvasContext.clearRect(0, 0, canvasWidth, canvasHeight);

    particles.forEach((particle, index) => {
      if (!reducedMotion) {
        particle.x += particle.dx;
        particle.y += particle.dy;
        if (particle.x < 0 || particle.x > canvasWidth) particle.dx *= -1;
        if (particle.y < 0 || particle.y > canvasHeight) particle.dy *= -1;
      }

      for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex += 1) {
        const other = particles[nextIndex];
        const distance = Math.hypot(particle.x - other.x, particle.y - other.y);
        if (distance < 170) {
          canvasContext.strokeStyle = `rgba(56, 194, 255, ${0.3 * (1 - distance / 170)})`;
          canvasContext.lineWidth = 1;
          canvasContext.beginPath();
          canvasContext.moveTo(particle.x, particle.y);
          canvasContext.lineTo(other.x, other.y);
          canvasContext.stroke();
        }
      }

      canvasContext.fillStyle = 'rgba(91, 218, 255, 0.82)';
      canvasContext.beginPath();
      canvasContext.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      canvasContext.fill();
    });

    if (!reducedMotion) animationFrame = window.requestAnimationFrame(drawNeuralNetwork);
  };

  resizeNeuralCanvas();
  drawNeuralNetwork();
  window.addEventListener('resize', () => {
    window.cancelAnimationFrame(animationFrame);
    resizeNeuralCanvas();
    drawNeuralNetwork();
  }, { passive: true });
}

document.querySelectorAll('[data-enquiry-type]').forEach((link) => {
  link.addEventListener('click', () => {
    const requestType = enquiryForm?.elements.namedItem('requestType');
    if (requestType) requestType.value = link.dataset.enquiryType;
  });
});

const connectLeadForm = (form, status, messages, preparePayload = (payload) => payload) => {
  if (!form || !status) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const payload = preparePayload(Object.fromEntries(new FormData(form).entries()));

    submitButton.disabled = true;
    status.textContent = messages.sending;

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || messages.error);
      }

      status.textContent = messages.success;
      form.reset();
    } catch (error) {
      status.textContent = error.message || messages.error;
    } finally {
      submitButton.disabled = false;
    }
  });
};

connectLeadForm(enquiryForm, enquiryStatus, {
  sending: 'Sending your enquiry...',
  success: 'Thanks. Your enquiry has been sent.',
  error: 'Your enquiry could not be sent. Please try again.'
});

connectLeadForm(feedbackForm, feedbackStatus, {
  sending: 'Sending your feedback...',
  success: 'Thank you. Your feedback has been sent privately.',
  error: 'Your feedback could not be sent. Please try again.'
}, ({ rating, message, ...lead }) => ({
  ...lead,
  requestType: 'Feedback',
  timeline: 'Not specified',
  message: `Rating: ${rating}/5\n\nFeedback: ${message}`
}));
