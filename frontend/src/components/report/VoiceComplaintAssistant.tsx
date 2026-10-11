import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, LoaderCircle, Mic, Square, WandSparkles, X } from 'lucide-react';
import { apiRequest } from '../../lib/api';

const MAX_RECORDING_SECONDS = 60;
type VoiceLanguage = 'ur' | 'ps';

const languageLabels: Record<VoiceLanguage, string> = {
  ur: 'Urdu',
  ps: 'Pashto',
};

interface VoiceDraft {
  language: VoiceLanguage;
  transcription: string;
  description: string;
  suggested_category: string;
}

interface VoiceComplaintAssistantProps {
  accessToken?: string;
  disabled?: boolean;
  validCategories: readonly string[];
  onDraftReady: (description: string, category: string) => void;
}

const preferredMimeType = (): string => {
  if (typeof MediaRecorder === 'undefined') return '';
  return [
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/webm',
  ].find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
};

const extensionForMimeType = (mimeType: string): string => {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'mp4';
  return 'webm';
};

export const VoiceComplaintAssistant: React.FC<VoiceComplaintAssistantProps> = ({
  accessToken,
  disabled = false,
  validCategories,
  onDraftReady,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<VoiceLanguage>('ur');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [draft, setDraft] = useState<VoiceDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    if (stopTimerRef.current !== null) window.clearTimeout(stopTimerRef.current);
    intervalRef.current = null;
    stopTimerRef.current = null;
  };

  const releaseMicrophone = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => () => {
    clearTimers();
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      if (recorder.state === 'recording') recorder.stop();
    }
    releaseMicrophone();
  }, []);

  const processRecording = async (blob: Blob) => {
    if (!accessToken) {
      setError('Your authenticated session is unavailable. Please sign in again.');
      return;
    }
    if (blob.size === 0) {
      setError('No audio was captured. Please record again or type your complaint manually.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      const mimeType = blob.type || 'audio/webm';
      const form = new FormData();
      form.append('audio', blob, `${selectedLanguage}-complaint.${extensionForMimeType(mimeType)}`);
      form.append('language', selectedLanguage);
      const response = await apiRequest<VoiceDraft>('/api/voice-complaints/draft', {
        method: 'POST',
        body: form,
        accessToken,
      });
      if (!validCategories.includes(response.suggested_category)) {
        throw new Error('The assistant returned an unsupported category.');
      }
      if (response.language !== selectedLanguage) {
        throw new Error('The assistant returned a draft in the wrong language. Please type your complaint manually.');
      }
      setDraft(response);
      onDraftReady(response.description, response.suggested_category);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to process the recording.');
    } finally {
      setIsProcessing(false);
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder?.state === 'recording') recorder.stop();
  };

  const startRecording = async () => {
    setError(null);
    setDraft(null);
    if (!accessToken) {
      setError('Your authenticated session is unavailable. Please sign in again.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Voice recording is not supported by this browser. You can still type your complaint.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = preferredMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      setElapsedSeconds(0);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        clearTimers();
        setIsRecording(false);
        releaseMicrophone();
        const recordedType = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: recordedType });
        chunksRef.current = [];
        void processRecording(blob);
      };
      recorder.onerror = () => {
        clearTimers();
        setIsRecording(false);
        recorder.onstop = null;
        chunksRef.current = [];
        releaseMicrophone();
        setError('Recording failed. Please try again or type your complaint manually.');
      };

      recorder.start(1000);
      setIsRecording(true);
      intervalRef.current = window.setInterval(() => {
        setElapsedSeconds((current) => Math.min(current + 1, MAX_RECORDING_SECONDS));
      }, 1000);
      stopTimerRef.current = window.setTimeout(stopRecording, MAX_RECORDING_SECONDS * 1000);
    } catch (cause) {
      releaseMicrophone();
      setError(
        cause instanceof DOMException && cause.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Allow access or type your complaint manually.'
          : 'The microphone could not be started. You can still type your complaint manually.',
      );
    }
  };

  return (
    <div className="mt-3 rounded border border-stone-200 bg-stone-50 p-3.5" aria-live="polite">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
            <WandSparkles className="h-4 w-4 text-orange-600" aria-hidden="true" />
            AI Voice Complaint Assistant
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
            Optional: speak naturally in Urdu or Pashto. Your recording prepares an editable draft and is never submitted automatically.
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <div className="inline-flex rounded border border-stone-300 bg-white p-0.5" aria-label="Voice complaint language">
            {(['ur', 'ps'] as const).map((language) => (
              <button
                key={language}
                type="button"
                onClick={() => {
                  setSelectedLanguage(language);
                  setDraft(null);
                  setError(null);
                }}
                disabled={isRecording || isProcessing || disabled}
                aria-pressed={selectedLanguage === language}
                className={`rounded px-3 py-1.5 text-[11px] font-bold transition-colors disabled:cursor-not-allowed ${
                  selectedLanguage === language
                    ? 'bg-orange-600 text-white'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {languageLabels[language]}
              </button>
            ))}
          </div>

          {isRecording ? (
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex items-center justify-center gap-2 rounded bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-500"
              aria-label={`Stop ${languageLabels[selectedLanguage]} complaint recording`}
            >
              <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              Stop · {elapsedSeconds}s
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void startRecording()}
              disabled={disabled || isProcessing}
              className="inline-flex items-center justify-center gap-2 rounded bg-stone-900 px-3 py-2 text-xs font-bold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {isProcessing ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Mic className="h-3.5 w-3.5 text-orange-400" aria-hidden="true" />
              )}
              {isProcessing
                ? `Preparing ${languageLabels[selectedLanguage]} draft…`
                : `Record in ${languageLabels[selectedLanguage]}`}
            </button>
          )}
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-xs font-medium text-red-600">{error}</p>
      ) : null}

      {draft ? (
        <div className="mt-3 rounded border border-emerald-200 bg-white p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Draft added for your review
            </div>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              aria-label="Dismiss voice transcription review"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-stone-500">
            {languageLabels[draft.language]} transcription
          </p>
          <p lang={draft.language} dir="rtl" className="mt-1 text-right text-sm leading-7 text-stone-800">{draft.transcription}</p>
          <p className="mt-2 text-[11px] text-stone-500">
            Suggested category: <strong className="text-stone-700">{draft.suggested_category}</strong>. Review and edit the description above before submitting.
          </p>
        </div>
      ) : null}
    </div>
  );
};
