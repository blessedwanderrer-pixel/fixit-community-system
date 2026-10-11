import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useFeedback } from '../../ui/FeedbackContext';

const IMPACT_DELAY_MS = 610;
const RESET_DELAY_MS = 1650;

export const HammerImpactScene: React.FC = () => {
  const [isStriking, setIsStriking] = useState(false);
  const [hasStruck, setHasStruck] = useState(false);
  const impactTimer = useRef<number | null>(null);
  const resetTimer = useRef<number | null>(null);
  const { playFeedback } = useFeedback();

  useEffect(() => () => {
    if (impactTimer.current) window.clearTimeout(impactTimer.current);
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
  }, []);

  const strike = () => {
    if (isStriking) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setHasStruck(false);
    setIsStriking(true);

    impactTimer.current = window.setTimeout(() => {
      setHasStruck(true);
      playFeedback('impact');
    }, reduceMotion ? 0 : IMPACT_DELAY_MS);

    resetTimer.current = window.setTimeout(() => {
      setIsStriking(false);
    }, reduceMotion ? 80 : RESET_DELAY_MS);
  };

  return (
    <div className="hammer-experience" data-striking={isStriking || undefined} data-impacted={hasStruck || undefined}>
      <div className="hammer-experience__chrome" aria-hidden="true">
        <span>FIELD SYSTEM / 01</span>
        <span className="hammer-experience__status"><i /> INTERACTIVE</span>
      </div>

      <button
        type="button"
        className="hammer-scene"
        onClick={strike}
        disabled={isStriking}
        aria-label={isStriking ? 'Hammer impact animation playing' : 'Strike the manhole cover with the hammer'}
        aria-describedby="hammer-scene-instruction"
      >
        <span className="hammer-scene__glow" aria-hidden="true" />
        <span className="hammer-scene__city" aria-hidden="true" />
        <span className="hammer-scene__road" aria-hidden="true">
          <i className="hammer-scene__road-line" />
        </span>

        <span className="hammer-tool" aria-hidden="true">
          <span className="hammer-tool__head">
            <i className="hammer-tool__face" />
            <i className="hammer-tool__neck" />
          </span>
          <span className="hammer-tool__handle"><i /></span>
        </span>

        <span className="manhole" aria-hidden="true">
          <span className="manhole__rim" />
          <span className="manhole__cover">
            <i className="manhole__ring manhole__ring--outer" />
            <i className="manhole__ring manhole__ring--inner" />
            <strong>FIXIT</strong>
            <small>COMMUNITY WORKS</small>
          </span>
        </span>

        <span className="impact-flash" aria-hidden="true" />
        <span className="sparks" aria-hidden="true">
          {Array.from({ length: 10 }, (_, index) => <i key={index} />)}
        </span>
      </button>

      <div className="hammer-experience__footer">
        <div>
          <span className="hammer-experience__eyebrow">Civic repair, engineered</span>
          <p id="hammer-scene-instruction">
            {isStriking ? 'Securing the street…' : hasStruck ? 'Cover secured. Tap to replay.' : 'Tap the hammer to secure the cover.'}
          </p>
        </div>
        <div className="hammer-experience__controls" aria-hidden="true">
          <RotateCcw />
          <span>Replayable</span>
        </div>
      </div>
    </div>
  );
};
