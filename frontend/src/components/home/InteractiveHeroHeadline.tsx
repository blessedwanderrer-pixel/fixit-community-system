import React, { useEffect, useRef } from 'react';
import { useI18n } from '../../i18n/I18nContext';

type LetterMotion = {
  x: number;
  y: number;
  rotation: number;
  rotateX: number;
  rotateY: number;
  depth: number;
  scale: number;
  vx: number;
  vy: number;
  vr: number;
  vrx: number;
  vry: number;
  vz: number;
  vs: number;
  targetX: number;
  targetY: number;
  targetRotation: number;
  targetRotateX: number;
  targetRotateY: number;
  targetDepth: number;
  targetScale: number;
};

const LINES = [
  { text: 'See a Problem.' },
  { text: 'Report It.', orange: true },
  { text: 'Track the Fix.' },
];

const makeMotion = (): LetterMotion => ({
  x: 0, y: 0, rotation: 0, rotateX: 0, rotateY: 0, depth: 0, scale: 1,
  vx: 0, vy: 0, vr: 0, vrx: 0, vry: 0, vz: 0, vs: 0,
  targetX: 0, targetY: 0, targetRotation: 0, targetRotateX: 0,
  targetRotateY: 0, targetDepth: 0, targetScale: 1,
});

export const InteractiveHeroHeadline: React.FC = () => {
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const { language, t } = useI18n();

  const renderLine = (line: (typeof LINES)[number]) => {
    const translated = t(line.text);
    if (language !== 'en') {
      return translated.split(' ').map((word, index, words) => (
        <React.Fragment key={`${word}-${index}`}>
          <span
            data-jelly-letter
            data-letter={word}
            className={`fixit-hero-headline__letter fixit-hero-headline__word${line.orange ? ' fixit-hero-headline__letter--orange' : ''}`}
          >
            {word}
          </span>
          {index < words.length - 1 && <span className="fixit-hero-headline__space"> </span>}
        </React.Fragment>
      ));
    }

    return Array.from(translated).map((character, characterIndex) => (
      character === ' '
        ? <span key={characterIndex} className="fixit-hero-headline__space"> </span>
        : (
          <span
            key={characterIndex}
            data-jelly-letter
            data-letter={character}
            className={`fixit-hero-headline__letter${line.orange ? ' fixit-hero-headline__letter--orange' : ''}`}
          >
            {character}
          </span>
        )
    ));
  };

  useEffect(() => {
    const headline = headlineRef.current;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!headline || !finePointer.matches || reducedMotion.matches) return;

    const letters = Array.from(headline.querySelectorAll<HTMLElement>('[data-jelly-letter]'));
    const motion = letters.map(makeMotion);
    let centers: Array<{ x: number; y: number }> = [];
    let frame = 0;

    const measure = () => {
      centers = letters.map((letter) => {
        const rect = letter.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      });
    };

    const animate = () => {
      let active = false;
      motion.forEach((state, index) => {
        const spring = 0.13;
        const damping = 0.72;
        state.vx = (state.vx + (state.targetX - state.x) * spring) * damping;
        state.vy = (state.vy + (state.targetY - state.y) * spring) * damping;
        state.vr = (state.vr + (state.targetRotation - state.rotation) * spring) * damping;
        state.vrx = (state.vrx + (state.targetRotateX - state.rotateX) * spring) * damping;
        state.vry = (state.vry + (state.targetRotateY - state.rotateY) * spring) * damping;
        state.vz = (state.vz + (state.targetDepth - state.depth) * spring) * damping;
        state.vs = (state.vs + (state.targetScale - state.scale) * spring) * damping;
        state.x += state.vx;
        state.y += state.vy;
        state.rotation += state.vr;
        state.rotateX += state.vrx;
        state.rotateY += state.vry;
        state.depth += state.vz;
        state.scale += state.vs;

        letters[index].style.transform = `translate3d(${state.x.toFixed(2)}px, ${state.y.toFixed(2)}px, ${state.depth.toFixed(2)}px) rotateX(${state.rotateX.toFixed(2)}deg) rotateY(${state.rotateY.toFixed(2)}deg) rotateZ(${state.rotation.toFixed(2)}deg) scale(${state.scale.toFixed(3)})`;
        active ||= (
          Math.abs(state.targetX - state.x) + Math.abs(state.targetY - state.y)
          + Math.abs(state.targetDepth - state.depth)
          + Math.abs(state.targetRotateX - state.rotateX) + Math.abs(state.targetRotateY - state.rotateY)
          + Math.abs(state.vx) + Math.abs(state.vy) + Math.abs(state.vz)
        ) > 0.08;
      });
      frame = active ? window.requestAnimationFrame(animate) : 0;
    };

    const startAnimation = () => {
      if (!frame) frame = window.requestAnimationFrame(animate);
    };

    const handlePointerMove = (event: PointerEvent) => {
      motion.forEach((state, index) => {
        const center = centers[index];
        const dx = center.x - event.clientX;
        const dy = center.y - event.clientY;
        const distance = Math.hypot(dx, dy);
        const influence = Math.max(0, 1 - distance / 145);
        const direction = distance ? 1 / distance : 0;
        state.targetX = dx * direction * influence * 8;
        state.targetY = dy * direction * influence * 6 - influence * 2;
        state.targetRotation = (dx / 145) * influence * 2.25;
        state.targetRotateX = (-dy / 145) * influence * 7;
        state.targetRotateY = (dx / 145) * influence * 8;
        state.targetDepth = influence * 14;
        state.targetScale = 1 + influence * 0.035;
      });
      startAnimation();
    };

    const settle = () => {
      motion.forEach((state) => {
        state.targetX = 0;
        state.targetY = 0;
        state.targetRotation = 0;
        state.targetRotateX = 0;
        state.targetRotateY = 0;
        state.targetDepth = 0;
        state.targetScale = 1;
      });
      startAnimation();
    };

    const handleEnter = () => measure();
    measure();
    headline.addEventListener('pointerenter', handleEnter);
    headline.addEventListener('pointermove', handlePointerMove);
    headline.addEventListener('pointerleave', settle);
    window.addEventListener('resize', measure, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      headline.removeEventListener('pointerenter', handleEnter);
      headline.removeEventListener('pointermove', handlePointerMove);
      headline.removeEventListener('pointerleave', settle);
      window.removeEventListener('resize', measure);
    };
  }, [language]);

  return (
    <h1
      ref={headlineRef}
      className="fixit-hero-headline"
      aria-label={`${t('See a Problem.')} ${t('Report It.')} ${t('Track the Fix.')}`}
    >
      {LINES.map((line) => (
        <span
          key={line.text}
          className={`fixit-hero-headline__line${line.orange ? ' fixit-hero-headline__line--orange' : ''}`}
          aria-hidden="true"
        >
          {renderLine(line)}
        </span>
      ))}
    </h1>
  );
};
