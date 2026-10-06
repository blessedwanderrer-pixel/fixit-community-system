import React from 'react';
import { PageHero } from '../components/common/PageHero';
import { SectionHeading } from '../components/common/SectionHeading';
import { WorkflowTimeline } from '../components/common/WorkflowTimeline';
import { CTA } from '../components/common/CTA';
import { ShieldCheck, Cpu, CheckCircle2, UserCheck, Eye, Sparkles } from 'lucide-react';

export const HowItWorksPage: React.FC = () => {
  return (
    <div className="w-full">
      <PageHero
        kicker="System Protocol"
        title="How the FixIt Reporting & Tracking Platform Operates"
        subtitle="Explore the complete lifecycle of an authenticated Citizen report, from advisory AI triage and human Admin review to Coordinator scheduling and private evidence."
        breadcrumbs={[{ label: 'How It Works' }]}
        actionPrimary={{ label: 'Report a Problem Now', href: '/report' }}
        actionSecondary={{ label: 'Track Existing Report', href: '/track' }}
      />

      {/* Main Interactive Workflow Section */}
      <section className="py-16 sm:py-24 bg-stone-50 border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="End-to-End Lifecycle"
            title="The 9-Phase Civic Resolution Pipeline"
            subtitle="Every report submitted to FixIt follows a rigorous operational sequence designed to maximize speed while guaranteeing human accountability and verifiable proof."
          />

          <WorkflowTimeline mode="full" />
        </div>
      </section>

      {/* Deep Dive on the AI Guardrail */}
      <section className="py-16 sm:py-20 bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-orange-600">
                AI Ethical Governance
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight mb-4">
              AI Assists. People Make the Final Decision.
            </h2>

            <p className="text-base text-stone-700 leading-relaxed mb-6">
              In civic technology, automated algorithms should never replace human empathy, local context, or administrative responsibility. At FixIt, our advisory AI performs targeted, non-binding tasks:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="p-4 rounded border border-stone-200 bg-stone-50">
                <div className="text-xs font-mono font-bold text-orange-600 mb-1">
                  WHAT ADVISORY AI DOES
                </div>
                <ul className="text-xs text-stone-600 space-y-1.5 list-disc pl-4">
                  <li>Generates a structured summary for Admin review.</li>
                  <li>Suggests a category and priority.</li>
                  <li>Provides a non-binding recommendation and reason.</li>
                  <li>Cannot alter report status or merge reports.</li>
                </ul>
              </div>

              <div className="p-4 rounded border border-stone-200 bg-stone-50">
                <div className="text-xs font-mono font-bold text-stone-700 mb-1">
                  WHAT ONLY HUMANS DO
                </div>
                <ul className="text-xs text-stone-600 space-y-1.5 list-disc pl-4">
                  <li>Admins approve, reject, or explicitly merge reports.</li>
                  <li>Coordinators schedule approved reports.</li>
                  <li>Coordinators upload private Before and After evidence.</li>
                  <li>Coordinators move eligible work to In Progress and Solved.</li>
                </ul>
              </div>
            </div>

            <div className="p-4 rounded bg-stone-900 text-stone-300 text-xs font-mono flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-orange-400 shrink-0" />
              <span>
                FixIt Guarantee: No citizen report is ever rejected or deleted by an automated algorithm. Human operations administrators review all submissions.
              </span>
            </div>
          </div>
        </div>
      </section>

      <CTA />
    </div>
  );
};
