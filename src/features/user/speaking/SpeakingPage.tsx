import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import speakingExaminerImage from '../../../assets/ai-agent-icon.jfif';
import { buildDidSpeakingFrameUrl } from './speakingModel';

type FrameStatusTone = 'loading' | 'ready' | 'error';

export function SpeakingPage() {
  const [entryMessage, setEntryMessage] = useState('');
  const [isExamOpen, setIsExamOpen] = useState(false);
  const [isStartingExam, setIsStartingExam] = useState(false);
  const [frameReloadKey] = useState(0);
  const [frameStatus, setFrameStatus] = useState('Ready to start same-origin examiner.');
  const [frameStatusTone, setFrameStatusTone] = useState<FrameStatusTone>('loading');

  useEffect(() => {
    if (!isExamOpen) {
      return undefined;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === 'did-script-loaded') {
        setFrameStatus('D-ID examiner loaded.');
        setFrameStatusTone('ready');
      }

      if (event.data?.type === 'did-script-error') {
        setFrameStatus('D-ID examiner failed to load. Check allowed domain and client key.');
        setFrameStatusTone('error');
      }

      if (event.data?.type === 'did-frame-config-error') {
        setFrameStatus('D-ID examiner configuration is missing. Check Vite runtime environment values.');
        setFrameStatusTone('error');
      }

      if (event.data?.type === 'did-frame-error') {
        setFrameStatus('D-ID frame error. Check browser console for details.');
        setFrameStatusTone('error');
      }
    };

    window.addEventListener('message', handleMessage);

    return () => window.removeEventListener('message', handleMessage);
  }, [isExamOpen]);

  const speakingFrameUrl = buildDidSpeakingFrameUrl(frameReloadKey);

  const handleStartExam = async () => {
    setIsStartingExam(true);
    setEntryMessage('Opening the virtual examiner.');
    setFrameStatus('Loading same-origin examiner...');
    setFrameStatusTone('loading');

    window.setTimeout(() => {
      setIsExamOpen(true);
      setIsStartingExam(false);
      setEntryMessage('Speaking examiner opened.');
    }, 0);
  };

  if (isExamOpen) {
    return (
      <section className="speaking-exam-page">
        <section className="speaking-exam-shell">
          <aside className="speaking-exam-side">
            <div>
              <h2>Speaking Full Exam</h2>
              <p>
                Complete your speaking exam with the virtual D-ID examiner in the secure exam
                workspace.
              </p>
            </div>

            <div className={`speaking-frame-status speaking-frame-status-${frameStatusTone}`}>
              <span aria-hidden="true" />
              {frameStatus}
            </div>

            <button
              className="speaking-exam-exit"
              type="button"
              onClick={() => {
                setIsExamOpen(false);
                setEntryMessage('Speaking exam returned to start screen.');
                setFrameStatus('Ready to start same-origin examiner.');
                setFrameStatusTone('loading');
              }}
            >
              Back to Speaking
            </button>
          </aside>

          <div className="speaking-exam-main">
            <div className="speaking-frame-stage">
              <iframe
                key={frameReloadKey}
                className="speaking-did-frame"
                title="D-ID Speaking Examiner"
                src={speakingFrameUrl}
                allow="microphone; camera; autoplay; clipboard-read; clipboard-write; fullscreen"
              />
            </div>
          </div>
        </section>
      </section>
    );
  }

  return (
    <PageFrame
      eyebrow="Speaking module"
      title="Virtual AI speaking examiner"
      description="Start the iframe-based virtual speaking examiner. This module is intentionally kept separate from the backend speaking session flow until full session, audio submission, and record orchestration are added later."
    >
      <section className="mx-auto max-w-5xl rounded bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div className="grid gap-6 rounded bg-[#fff9eb] p-6 lg:grid-cols-[1fr_320px] lg:items-center">
          <div>
            <div className="max-w-xl">
              <span className="rounded bg-[#f1bd03] px-3 py-1 text-sm font-bold text-[#0a1622]">
                Speaking exam
              </span>
              <h2 className="mt-5 text-3xl font-bold">Meet your virtual AI examiner</h2>
              <p className="mt-4 leading-7 text-slate-600">
                The examiner opens in a same-origin iframe and follows the configured D-ID flow.
                SmartIELTS platform session records and audio submission are not connected to this
                module in the current release.
              </p>
            </div>
          </div>

          <div className="grid place-items-center justify-self-center">
            <img
              alt="Virtual AI examiner"
              className="h-80 w-80 object-contain"
              src={speakingExaminerImage}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-500">
            {entryMessage || 'When you are ready, open the virtual examiner.'}
          </p>
          <button
            className="btn-arrow rounded bg-[#f1bd03] px-5 py-3 font-bold text-[#0a1622]"
            type="button"
            disabled={isStartingExam}
            onClick={handleStartExam}
          >
            {isStartingExam ? 'Opening...' : 'Open examiner'}
            <span aria-hidden="true">-&gt;</span>
          </button>
        </div>
      </section>
    </PageFrame>
  );
}

function PageFrame({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-12 pb-32 md:pb-12">
      <div className="mb-8 max-w-3xl">
        <p className="text-sm font-bold tracking-[0.2em] text-[#6995b1]">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">{title}</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">{description}</p>
      </div>
      {children}
    </section>
  );
}
