import React, { useEffect, useRef } from 'react';
import { useI18n } from '../../i18n/I18nContext';

const headlineLines: ReadonlyArray<{ key: string; accent?: boolean }> = [
  { key: 'Your street' },
  { key: 'problem has' },
  { key: 'one place to go.', accent: true },
] as const;

export const HeroCursorHeadline: React.FC = () => {
  const rootRef = useRef<HTMLHeadingElement>(null);
  const { language, t } = useI18n();
  const isArabicScript = language !== 'en';

  useEffect(() => {
    const root = rootRef.current;
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!root || !canHover.matches || reduceMotion.matches) return undefined;

    const lines = Array.from(root.querySelectorAll<HTMLElement>('[data-cursor-line]'));
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;
    let frame = 0;

    const render = () => {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      lines.forEach((line, index) => {
        const strength = 1 - index * 0.16;
        line.style.setProperty('--hero-shift-x', `${(currentX * strength * 5).toFixed(2)}px`);
        line.style.setProperty('--hero-shift-y', `${(currentY * strength * 2.5).toFixed(2)}px`);
        line.style.setProperty('--hero-tilt', `${(currentX * strength * 0.7).toFixed(2)}deg`);
      });

      if (Math.abs(targetX - currentX) + Math.abs(targetY - currentY) > 0.01) {
        frame = window.requestAnimationFrame(render);
      } else {
        frame = 0;
      }
    };

    const start = () => {
      if (!frame) frame = window.requestAnimationFrame(render);
    };

    const move = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      targetX = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
      targetY = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
      root.style.setProperty('--hero-cursor-x', `${event.clientX - rect.left}px`);
      root.style.setProperty('--hero-cursor-y', `${event.clientY - rect.top}px`);
      start();
    };

    const leave = () => {
      targetX = 0;
      targetY = 0;
      start();
    };

    root.addEventListener('pointermove', move);
    root.addEventListener('pointerleave', leave);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      root.removeEventListener('pointermove', move);
      root.removeEventListener('pointerleave', leave);
    };
  }, [language]);

  return (
    <h1
      ref={rootRef}
      className={`home-cursor-headline max-w-4xl font-black text-stone-950 ${isArabicScript ? 'text-[clamp(2.8rem,5.3vw,4.9rem)] leading-[1.12] tracking-normal' : 'text-[clamp(3.35rem,6.25vw,5.7rem)] uppercase leading-[.84] tracking-[-.065em]'}`}
    >
      {headlineLines.map((line) => (
        <span
          key={line.key}
          data-cursor-line
          className={`home-cursor-headline__line ${line.accent ? `${isArabicScript ? '' : 'font-editorial-accent normal-case'} text-orange-600` : ''}`}
        >
          {t(line.key)}
        </span>
      ))}
    </h1>
  );
};
