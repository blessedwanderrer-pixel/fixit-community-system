import { useEffect } from 'react';

export const useMotionEffects = (routeKey: string) => {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.querySelector('main');
    if (!root) return;

    if (reducedMotion) {
      root.classList.remove('page-transitioning');
      root.classList.add('page-entered');
      return;
    }

    root.classList.add('page-transitioning');
    root.classList.remove('page-entered');
    const frame = window.requestAnimationFrame(() => root.classList.add('page-entered'));
    const targets = Array.from(root.querySelectorAll<HTMLElement>('section, article, .civic-card'));
    targets.forEach((element, index) => {
      element.classList.add('motion-reveal');
      element.style.setProperty('--reveal-delay', `${Math.min(index % 4, 3) * 55}ms`);
    });

    const reveal = (element: HTMLElement) => {
      element.classList.add('motion-visible');
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target as HTMLElement);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.01, rootMargin: '0px 0px 8% 0px' });

    targets.forEach((target) => observer.observe(target));

    // IntersectionObserver can miss deeply nested or very tall sections after a
    // route change. Never allow decorative motion to leave real page content hidden.
    const revealFallback = window.setTimeout(() => {
      targets.forEach(reveal);
    }, 900);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(revealFallback);
      observer.disconnect();
    };
  }, [routeKey]);
};
