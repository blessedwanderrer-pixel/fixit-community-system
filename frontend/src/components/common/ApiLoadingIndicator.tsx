import { useEffect, useState, useSyncExternalStore } from 'react';
import { getApiLoadingSnapshot, subscribeToApiLoading } from '../../lib/api';
import { useI18n } from '../../i18n/I18nContext';

const dots = [
  { radius: 10, count: 8 },
  { radius: 16, count: 12 },
  { radius: 23, count: 16 },
].flatMap(({ radius, count }, ring) =>
  Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    return {
      key: `${ring}-${index}`,
      left: 28 + Math.cos(angle) * radius,
      top: 28 + Math.sin(angle) * radius,
      delay: -((index / count) * 1.35 + ring * 0.13),
      size: ring === 0 ? 3.5 : ring === 1 ? 3 : 2.5,
    };
  }),
);

export const ApiLoadingIndicator: React.FC = () => {
  const { t } = useI18n();
  const previewRequested = import.meta.env.DEV
    && new URLSearchParams(window.location.search).has('preview-loader');
  const isLoading = useSyncExternalStore(
    subscribeToApiLoading,
    getApiLoadingSnapshot,
    () => false,
  );
  const [apiVisible, setApiVisible] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [mounted, setMounted] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setApiVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setApiVisible(true), 150);
    return () => window.clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    let cancelled = false;

    const finishPageLoad = async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      if (previewRequested) {
        window.setTimeout(() => {
          if (!cancelled) setPageLoading(false);
        }, 2500);
        return;
      }
      window.requestAnimationFrame(() => {
        if (!cancelled) setPageLoading(false);
      });
    };

    if (document.readyState === 'complete') void finishPageLoad();
    else window.addEventListener('load', finishPageLoad, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener('load', finishPageLoad);
    };
  }, [previewRequested]);

  const visible = pageLoading || apiVisible;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setExiting(false);
      document.documentElement.classList.remove('fixit-page-ready');
      return undefined;
    }

    setExiting(true);
    document.documentElement.classList.add('fixit-page-ready');
    const timer = window.setTimeout(() => setMounted(false), 560);
    return () => window.clearTimeout(timer);
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  if (!mounted) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t('Loading…')}
      dir="ltr"
      className={`api-wavy-loader fixed inset-0 z-[1000] flex flex-col items-center justify-center gap-7 text-sm font-bold text-stone-900${exiting ? ' api-wavy-loader--exiting' : ''}`}
    >
      <span className="api-wavy-loader__field" aria-hidden="true">
        {dots.map((dot) => (
          <span
            key={dot.key}
            className="api-wavy-loader__dot"
            style={{
              left: dot.left,
              top: dot.top,
              width: dot.size,
              height: dot.size,
              animationDelay: `${dot.delay}s`,
            }}
          />
        ))}
      </span>
      <span className="tracking-[.08em]">{t('Loading…')}</span>
    </div>
  );
};
