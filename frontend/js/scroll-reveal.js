/**
 * Scroll Reveal Animation Controller
 * Inspired by Upstatement's scroll-triggered animations
 *
 * Usage:
 * Add class "scroll-reveal" to any element you want to animate on scroll
 * Add class "scroll-reveal-stagger" to containers with multiple children
 */

class ScrollReveal {
  constructor(options = {}) {
    this.options = {
      threshold: options.threshold || 0.1,
      rootMargin: options.rootMargin || '0px 0px -100px 0px',
      animateOnce: options.animateOnce !== false,
    };

    this.observer = null;
    this.init();
  }

  init() {
    // Check for Intersection Observer support
    if (!('IntersectionObserver' in window)) {
      console.warn('IntersectionObserver not supported, revealing all elements immediately');
      this.revealAllElements();
      return;
    }

    // Create observer
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        threshold: this.options.threshold,
        rootMargin: this.options.rootMargin,
      }
    );

    // Observe all elements with scroll-reveal class
    this.observeElements();
  }

  observeElements() {
    const elements = document.querySelectorAll('.scroll-reveal, .scroll-reveal-stagger');
    elements.forEach(element => {
      this.observer.observe(element);
    });
  }

  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');

        // Stop observing if animateOnce is true
        if (this.options.animateOnce) {
          this.observer.unobserve(entry.target);
        }
      } else {
        // Remove class if we want to re-animate
        if (!this.options.animateOnce) {
          entry.target.classList.remove('is-visible');
        }
      }
    });
  }

  revealAllElements() {
    const elements = document.querySelectorAll('.scroll-reveal, .scroll-reveal-stagger');
    elements.forEach(element => {
      element.classList.add('is-visible');
    });
  }

  // Add new elements to observe (useful for dynamic content)
  refresh() {
    if (this.observer) {
      this.observeElements();
    }
  }

  // Destroy the observer
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.scrollReveal = new ScrollReveal({
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px',
    animateOnce: true,
  });
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScrollReveal;
}
