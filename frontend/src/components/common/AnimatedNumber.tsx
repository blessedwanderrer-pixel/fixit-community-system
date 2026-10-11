import React, { useEffect, useState } from 'react';

interface AnimatedNumberProps {
  value: string | number;
  format?: (value: number) => string;
  className?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value, format, className = '' }) => {
  const target = Number(value);
  const [display, setDisplay] = useState(() => Number.isFinite(target) ? 0 : target);

  useEffect(() => {
    if (!Number.isFinite(target) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(target);
      return;
    }

    const duration = 650;
    const startedAt = performance.now();
    let frame = 0;
    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(target * eased);
      if (progress < 1) frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [target]);

  const rendered = format ? format(display) : Math.round(display).toLocaleString();
  return <span className={className}>{rendered}</span>;
};
