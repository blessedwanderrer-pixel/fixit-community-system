import { useEffect } from 'react';

export const useMotionEffects = (routeKey: string) => {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.querySelector('main');
    if (!root || reducedMotion) return;

    root.classList.remove('page-entered');
    const frame = window.requestAnimationFrame(() => root.classList.add('page-entered'));
    const targets = Array.from(root.querySelectorAll<HTMLElement>('section, article, .civic-card'));
    targets.forEach((element, index) => {
      element.classList.add('motion-reveal');
      element.style.setProperty('--reveal-delay', `${Math.min(index % 4, 3) * 55}ms`);
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).classList.add('motion-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });

    targets.forEach((target) => observer.observe(target));
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [routeKey]);
};
