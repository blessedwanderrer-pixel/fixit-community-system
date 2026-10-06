import React, { useState } from 'react';
import { 
  FileText, 
  Hash, 
  CopyCheck, 
  Cpu, 
  CheckCircle2, 
  Calendar, 
  Wrench, 
  Camera, 
  CheckCheck,
  ShieldCheck,
  ArrowRight,
  Info
} from 'lucide-react';

interface WorkflowTimelineProps {
  mode?: 'full' | 'compact';
  className?: string;
}

export const WORKFLOW_STEPS = [
  {
    step: '01',
    name: 'REPORT',
    title: 'Citizen Report Submission',
    desc: 'An authenticated Citizen reports a civic issue (damaged road, water leak, waste hazard) with location description and photos.',
    icon: FileText,
    accent: 'border-orange-500 text-orange-600',
    humanNote: 'Citizen initiates action',
  },
  {
    step: '02',
    name: 'TRACK',
    title: 'Unique Tracking ID',
    desc: 'The system assigns a unique Tracking ID. An authenticated Citizen can use it only for a report linked to their account.',
    icon: Hash,
    accent: 'border-stone-700 text-stone-700',
    humanNote: 'Authenticated Citizen lookup',
  },
  {
    step: '03',
    name: 'CHECK',
    title: 'Duplicate & Proximity Scan',
    desc: 'A same-category active report within 100 metres is marked as a Possible Duplicate. An Admin decides whether to merge.',
    icon: CopyCheck,
    accent: 'border-blue-500 text-blue-600',
    humanNote: 'No automatic merge',
  },
  {
    step: '04',
    name: 'AI TRIAGE',
    title: 'Advisory AI Analysis',
    desc: 'AI provides structured advisory triage for an Admin reviewer. It cannot change status, schedule work, or merge reports.',
    icon: Cpu,
    accent: 'border-purple-500 text-purple-600',
    humanNote: 'Advisory only. People decide.',
    highlight: true,
  },
  {
    step: '05',
    name: 'ADMIN REVIEW',
    title: 'Human Admin Decision',
    desc: 'A FixIt Admin reviews the report and decides whether to approve, reject, or explicitly merge a Possible Duplicate.',
    icon: CheckCircle2,
    accent: 'border-sky-500 text-sky-600',
    humanNote: 'Human oversight & sign-off',
  },
  {
    step: '06',
    name: 'SCHEDULE',
    title: 'Coordinator Scheduling',
    desc: 'A Coordinator selects an approved report, records a scheduled date and may add work details.',
    icon: Calendar,
    accent: 'border-indigo-500 text-indigo-600',
    humanNote: 'Field operations plan',
  },
  {
    step: '07',
    name: 'IN PROGRESS',
    title: 'Field Execution',
    desc: 'The assigned Coordinator changes Scheduled to In Progress when work begins. Authenticated Citizens can track linked reports.',
    icon: Wrench,
    accent: 'border-amber-500 text-amber-600',
    humanNote: 'Active on-ground work',
  },
  {
    step: '08',
    name: 'PROOF OF WORK',
    title: 'Before & After Verification',
    desc: 'The assigned Coordinator uploads required Before and After images. The media remains private.',
    icon: Camera,
    accent: 'border-teal-500 text-teal-600',
    humanNote: 'Private required evidence',
  },
  {
    step: '09',
    name: 'SOLVED',
    title: 'Case Resolution & Archive',
    desc: 'After both evidence stages exist, the assigned Coordinator may change In Progress to Solved. Public transparency receives only a safe completed-work summary.',
    icon: CheckCheck,
    accent: 'border-emerald-500 text-emerald-600',
    humanNote: 'Safe public summary',
  },
];

export const DONATION_STEPS = [
  {
    step: '01',
    name: 'DONATION',
    title: 'Citizen Contribution',
    desc: 'Supporter makes a voluntary direct contribution via bank transfer, Easypaisa, or JazzCash to FixIt official accounts.',
  },
  {
    step: '02',
    name: 'PROOF',
    title: 'Submission of Receipt',
    desc: 'Donor uploads transaction reference number and receipt screenshot for auditing.',
  },
  {
    step: '03',
    name: 'ADMIN AUDIT',
    title: 'Human Finance Verification',
    desc: 'FixIt finance coordinators manually reconcile against incoming bank statements. (No claim of instant automated verification).',
  },
  {
    step: '04',
    name: 'VERIFIED',
    title: 'Admin Verification',
    desc: 'An Admin marks the submission Verified only after matching it against FixIt\'s actual wallet or bank record.',
  },
  {
    step: '05',
    name: 'TRANSPARENCY',
    title: 'Aggregate Transparency',
    desc: 'Public Transparency includes the aggregate Verified donation total and aggregate Approved spending total, without private proofs or identities.',
  },
];

export const WorkflowTimeline: React.FC<WorkflowTimelineProps> = ({
  mode = 'full',
  className = '',
}) => {
  const [activeStep, setActiveStep] = useState(3); // Default on AI Triage to highlight the advisory aspect

  if (mode === 'compact') {
    // 5-step simplified flow for Homepage: REPORT → REVIEW → SCHEDULE → IN PROGRESS → SOLVED
    const compactSteps = [
      { step: '01', label: 'REPORT', desc: 'Citizen submits issue' },
      { step: '02', label: 'REVIEW', desc: 'FixIt admins evaluate' },
      { step: '03', label: 'SCHEDULE', desc: 'Coordinator sets schedule' },
      { step: '04', label: 'IN PROGRESS', desc: 'On-ground repair begins' },
      { step: '05', label: 'SOLVED', desc: 'Safe summary may be public' },
    ];

    return (
      <div className={`w-full ${className}`}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 lg:gap-4">
          {compactSteps.map((item, idx) => (
            <div
              key={item.step}
              className="relative p-4 rounded border border-stone-200 bg-white shadow-xs hover:border-orange-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-orange-600">
                  {item.step}
                </span>
                {idx < compactSteps.length - 1 && (
                  <ArrowRight className="hidden md:block w-3.5 h-3.5 text-stone-300 absolute -right-2 top-1/2 -translate-y-1/2 z-10 bg-white" />
                )}
              </div>
              <h4 className="text-sm font-bold text-stone-900 tracking-tight">
                {item.label}
              </h4>
              <p className="text-xs text-stone-500 mt-1 leading-snug">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* 9-step Journey */}
      <div className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <span className="font-bold">Human-Governed Workflow:</span> AI provides initial advisory categorization and urgency estimates to speed up response times. FixIt operations administrators and ground coordinators make 100% of final deployment decisions.
          </div>
        </div>

        {/* Vertical Journey with interactive preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Step Selector Column */}
          <div className="lg:col-span-5 space-y-2">
            {WORKFLOW_STEPS.map((s, idx) => {
              const Icon = s.icon;
              const isSelected = activeStep === idx;
              return (
                <button
                  key={s.step}
                  onClick={() => setActiveStep(idx)}
                  className={`w-full text-left p-3.5 rounded border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-stone-900 text-white border-stone-900 shadow-md'
                      : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-orange-600 text-white'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {s.step}
                    </span>
                    <span className="text-sm font-bold truncate">
                      {s.name}
                    </span>
                  </div>

                  <span
                    className={`text-xs ${
                      isSelected ? 'text-orange-400' : 'text-stone-400'
                    }`}
                  >
                    {s.humanNote}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Step Deep-Dive Card */}
          <div className="lg:col-span-7 sticky top-24">
            {(() => {
              const cur = WORKFLOW_STEPS[activeStep];
              const CurIcon = cur.icon;
              return (
                <div className="rounded border border-stone-300 bg-white p-6 sm:p-8 shadow-sm">
                  <div className="flex items-center justify-between pb-6 border-b border-stone-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                        <CurIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-xs font-mono font-bold text-orange-600 tracking-wider">
                          PHASE {cur.step} / 09
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black text-stone-900">
                          {cur.title}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <div className="py-6">
                    <p className="text-base text-stone-700 leading-relaxed">
                      {cur.desc}
                    </p>

                    {cur.highlight && (
                      <div className="mt-6 p-4 rounded bg-stone-900 text-stone-200 border-l-4 border-orange-500">
                        <div className="text-xs font-mono uppercase tracking-wider text-orange-400 mb-1">
                          Advisory Safety Guardrail
                        </div>
                        <p className="text-sm">
                          FixIt enforces an uncompromising principle: <strong className="text-white">AI assists. People make the final decision.</strong> Algorithms never dismiss a citizen complaint or authorize equipment dispatch without admin verification.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                    <span>Guaranteed civic accountability</span>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={activeStep === 0}
                        onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
                        className="px-2.5 py-1 rounded border border-stone-200 hover:bg-stone-50 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        Previous
                      </button>
                      <button
                        disabled={activeStep === WORKFLOW_STEPS.length - 1}
                        onClick={() =>
                          setActiveStep((prev) =>
                            Math.min(WORKFLOW_STEPS.length - 1, prev + 1)
                          )
                        }
                        className="px-2.5 py-1 rounded bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        Next Step
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Secondary Flow: Donation Accountability Flow */}
      <div className="mt-16 pt-12 border-t border-stone-200">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-bold uppercase tracking-widest text-orange-600">
              Financial Transparency Mechanism
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-stone-900">
            Donation Verification Workflow
          </h3>
          <p className="text-sm text-stone-600 mt-1 max-w-2xl">
            We do not claim automated Easypaisa or JazzCash scraping. Admins manually verify proofs against FixIt records; only aggregate Verified donations and aggregate Approved spending are public.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {DONATION_STEPS.map((step, idx) => (
            <div
              key={step.step}
              className="p-4 rounded border border-stone-200 bg-white relative hover:border-stone-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-orange-600">
                  {step.step}
                </span>
                <span className="text-xs font-bold text-stone-400">
                  {step.name}
                </span>
              </div>
              <h4 className="text-sm font-bold text-stone-900 mb-1.5">
                {step.title}
              </h4>
              <p className="text-xs text-stone-500 leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
