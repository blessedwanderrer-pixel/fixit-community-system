import React, { useEffect, useRef, useState } from 'react';
import { Check, RotateCcw, Wrench } from 'lucide-react';
import { useFeedback } from '../../ui/FeedbackContext';

type RepairPhase = 'idle' | 'energizing' | 'sealing' | 'complete';

const crackPaths = [
  'M24 15 31 25 39 30 45 43 51 49 58 65 65 73 72 88',
  'M3 39 16 42 27 50 39 52 51 49',
  'M18 84 29 72 40 68 48 58 58 65',
  'M56 4 54 18 58 31 54 42 51 49',
  'M97 20 85 27 77 39 65 43 51 49',
  'M99 66 86 62 73 68 58 65',
  'M88 97 80 84 72 88 65 73',
  'M31 25 25 31 17 30 M39 30 43 20 41 12 M45 43 36 42 31 37',
  'M77 39 82 45 92 48 M65 43 68 34 74 31 M73 68 78 75 87 76',
  'M40 68 36 79 30 83 M54 42 61 35 64 26 M80 84 73 95',
];

const sparkPoints = [
  { left: '51%', top: '49%', delay: '0ms' },
  { left: '64%', top: '43%', delay: '180ms' },
  { left: '40%', top: '67%', delay: '360ms' },
  { left: '73%', top: '68%', delay: '520ms' },
  { left: '31%', top: '25%', delay: '680ms' },
];

export const CrackTheScreen: React.FC = () => {
  const [phase, setPhase] = useState<RepairPhase>('idle');
  const timers = useRef<number[]>([]);
  const { playFeedback } = useFeedback();
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const clearTimers = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  };

  useEffect(() => clearTimers, []);

  const startRepair = () => {
    if (phase === 'energizing' || phase === 'sealing') return;
    clearTimers();
    const begin = () => {
      setPhase('energizing');
      playFeedback('impact');
      timers.current.push(window.setTimeout(() => setPhase('sealing'), reducedMotion ? 90 : 850));
      timers.current.push(window.setTimeout(() => {
        setPhase('complete');
        playFeedback('complete');
      }, reducedMotion ? 180 : 2650));
    };
    if (phase === 'complete') {
      setPhase('idle');
      timers.current.push(window.setTimeout(begin, reducedMotion ? 30 : 180));
    } else begin();
  };

  const running = phase === 'energizing' || phase === 'sealing';

  return (
    <div className="crack-screen" data-phase={phase}>
      <div className="crack-screen__topline">
        <div>
          <span>Interactive civic demonstration</span>
          <h3>Damage is visible. So is the solution.</h3>
        </div>
        <small>LIGHTWEIGHT SVG · NO WEBGL</small>
      </div>

      <div className="crack-screen__surface" aria-live="polite">
        <div className="crack-screen__light" aria-hidden="true" />
        <svg className="crack-screen__cracks" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <filter id="repair-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="0.65" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <g className="crack-screen__shadow-lines">
            {crackPaths.map((path) => <path key={`shadow-${path}`} d={path} pathLength="1" />)}
          </g>
          <g className="crack-screen__energy-lines" filter="url(#repair-glow)">
            {crackPaths.map((path) => <path key={`energy-${path}`} d={path} pathLength="1" />)}
          </g>
        </svg>

        <div className="crack-screen__sparks" aria-hidden="true">
          {sparkPoints.map((point, index) => <i key={index} style={{ ...point, '--spark-delay': point.delay } as React.CSSProperties} />)}
        </div>

        {phase === 'idle' ? (
          <button className="crack-screen__fix-button" type="button" onClick={startRepair} data-sound-primary="false">
            <Wrench />
            <span>FIX IT</span>
          </button>
        ) : null}

        {phase === 'complete' ? (
          <div className="crack-screen__message" role="status">
            <i><Check /></i>
            <strong>Every Problem<br />Deserves a Solution.</strong>
            <small>Illustrative experience complete</small>
          </div>
        ) : null}
      </div>

      <div className="crack-screen__footer">
        <div className="crack-screen__meter" aria-hidden="true"><i /><i /><i /></div>
        <p>{phase === 'idle' ? 'Surface damage detected.' : phase === 'energizing' ? 'Repair energy activated…' : phase === 'sealing' ? 'Sealing the damaged surface…' : 'Surface restored.'}</p>
        {phase !== 'idle' ? (
          <button type="button" onClick={startRepair} disabled={running} data-sound-primary="false">
            {phase === 'complete' ? <><RotateCcw /> Replay</> : 'Repairing…'}
          </button>
        ) : null}
      </div>
    </div>
  );
};
