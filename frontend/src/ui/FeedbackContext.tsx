import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';

type FeedbackTone = 'click' | 'success' | 'complete' | 'error' | 'impact' | 'asphalt' | 'roller';

interface FeedbackContextValue { playFeedback: (tone: FeedbackTone) => void; }
type BrowserAudioContext = AudioContext;
const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const createAudioContext = (): BrowserAudioContext | null => {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  try {
    const context = new AudioContextClass({ latencyHint: 'interactive' });
    const exposeState = () => { document.documentElement.dataset.fixitAudioState = context.state; };
    exposeState();
    context.addEventListener('statechange', exposeState);
    return context;
  } catch { return null; }
};

const makeNoiseBuffer = (context: BrowserAudioContext, duration: number) => {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
  return buffer;
};

const addOscillator = (context: BrowserAudioContext, destination: AudioNode, frequency: number, offset: number, duration: number, volume: number, type: OscillatorType = 'sine') => {
  const start = context.currentTime + offset;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * 0.72), start + duration);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(volume, start + 0.006);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(envelope).connect(destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
};

const addNoise = (context: BrowserAudioContext, destination: AudioNode, duration: number, volume: number, filterType: BiquadFilterType, frequency: number, offset = 0) => {
  const start = context.currentTime + offset;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  source.buffer = makeNoiseBuffer(context, duration);
  filter.type = filterType;
  filter.frequency.setValueAtTime(frequency, start);
  filter.Q.value = filterType === 'bandpass' ? 1.5 : 0.7;
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter).connect(envelope).connect(destination);
  source.start(start);
  source.stop(start + duration + 0.02);
};

const synthesize = (context: BrowserAudioContext, tone: FeedbackTone) => {
  if (context.state !== 'running') return false;
  document.documentElement.dataset.fixitAudioPlays = String(Number(document.documentElement.dataset.fixitAudioPlays ?? 0) + 1);
  document.documentElement.dataset.fixitAudioTone = tone;
  const compressor = context.createDynamicsCompressor();
  const master = context.createGain();
  compressor.threshold.value = -20;
  compressor.knee.value = 16;
  compressor.ratio.value = 7;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.16;
  master.gain.value = tone === 'roller' || tone === 'asphalt' ? 0.045 : 0.055;
  master.connect(compressor).connect(context.destination);

  if (tone === 'impact') {
    addNoise(context, master, 0.24, 0.8, 'bandpass', 1250);
    addNoise(context, master, 0.1, 0.4, 'highpass', 3900, 0.018);
    addOscillator(context, master, 92, 0, 0.2, 0.9, 'triangle');
    addOscillator(context, master, 310, 0.008, 0.09, 0.28, 'square');
  } else if (tone === 'asphalt') {
    addNoise(context, master, 0.62, 0.55, 'lowpass', 720);
    addNoise(context, master, 0.42, 0.2, 'bandpass', 1850, 0.08);
  } else if (tone === 'roller') {
    addNoise(context, master, 1.15, 0.38, 'lowpass', 420);
    [0, 0.22, 0.44, 0.66, 0.88].forEach((offset) => addOscillator(context, master, 68, offset, 0.19, 0.45, 'sawtooth'));
  } else {
    const patterns: Record<Exclude<FeedbackTone, 'impact' | 'asphalt' | 'roller'>, Array<[number, number, number]>> = {
      click: [[420, 0, 0.045]],
      success: [[520, 0, 0.08], [680, 0.075, 0.11]],
      complete: [[440, 0, 0.09], [590, 0.08, 0.11], [760, 0.17, 0.14]],
      error: [[220, 0, 0.09], [175, 0.08, 0.12]],
    };
    patterns[tone].forEach(([frequency, offset, duration]) => addOscillator(context, master, frequency, offset, duration, 0.5, tone === 'error' ? 'triangle' : 'sine'));
  }

  window.setTimeout(() => { try { master.disconnect(); compressor.disconnect(); } catch { /* Already disconnected. */ } }, tone === 'roller' ? 1400 : 850);
  return true;
};

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioContextRef = useRef<BrowserAudioContext | null>(null);
  const lastPlayedRef = useRef<Partial<Record<FeedbackTone, number>>>({});
  const getContext = useCallback(() => {
    const context = audioContextRef.current ?? createAudioContext();
    audioContextRef.current = context;
    return context;
  }, []);

  const playFeedback = useCallback((tone: FeedbackTone) => {
    const now = performance.now();
    const cooldown = tone === 'roller' ? 900 : tone === 'asphalt' ? 450 : 110;
    if (now - (lastPlayedRef.current[tone] ?? 0) < cooldown) return;
    const context = getContext();
    if (!context) return;
    const play = () => { if (synthesize(context, tone)) lastPlayedRef.current[tone] = performance.now(); };
    if (context.state === 'running') play();
    else void context.resume().then(play).catch(() => undefined);
  }, [getContext]);

  useEffect(() => {
    const unlock = () => {
      const context = getContext();
      if (context?.state === 'suspended') void context.resume().catch(() => undefined);
    };
    window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
    window.addEventListener('touchstart', unlock, { capture: true, passive: true });
    window.addEventListener('keydown', unlock, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true });
      window.removeEventListener('touchstart', unlock, { capture: true });
      window.removeEventListener('keydown', unlock, { capture: true });
    };
  }, [getContext]);

  useEffect(() => {
    const handlePrimaryAction = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('button, a') : null;
      if (!target || target.hasAttribute('disabled')) return;
      if (target.dataset.soundPrimary === 'true' || target.className.includes('bg-orange-600') || target.className.includes('civic-button-primary')) playFeedback('click');
    };
    document.addEventListener('click', handlePrimaryAction);
    return () => document.removeEventListener('click', handlePrimaryAction);
  }, [playFeedback]);

  useEffect(() => () => {
    const context = audioContextRef.current;
    if (context && context.state !== 'closed') void context.close();
  }, []);

  const value = useMemo(() => ({ playFeedback }), [playFeedback]);
  return <FeedbackContext.Provider value={value}>{children}</FeedbackContext.Provider>;
};

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedback must be used within FeedbackProvider.');
  return context;
};
