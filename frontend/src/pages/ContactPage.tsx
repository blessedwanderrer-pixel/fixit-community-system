import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Handshake, ShieldCheck, Users } from 'lucide-react';
import { PageHero } from '../components/common/PageHero';
import { CTA } from '../components/common/CTA';

export const ContactPage: React.FC = () => (
  <div className="w-full">
    <PageHero
      kicker="Citizen Information & Partnerships"
      title="Connect with FixIt Pakistan"
      subtitle="Use the authenticated platform for community reports and donation proofs, or review the information below for other enquiries."
      breadcrumbs={[{ label: 'Contact' }]}
      actionPrimary={{ label: 'Report a Problem', href: '/report' }}
      actionSecondary={{ label: 'Frequently Asked Questions', href: '/faq' }}
    />

    <section className="py-16 sm:py-24 bg-stone-50 border-b border-stone-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded border border-amber-200 bg-amber-50 p-5 sm:p-6 mb-8 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-bold text-amber-950">Online contact submission is not available</h2>
            <p className="mt-1 text-xs sm:text-sm text-amber-900 leading-relaxed">
              This site does not currently send or store general contact messages. Use the authenticated report and donation-proof workflows for supported actions; no message is submitted from this page.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded border border-stone-200 bg-white shadow-xs">
            <Users className="w-6 h-6 text-orange-600" />
            <h3 className="mt-4 text-base font-bold text-stone-900">Community Problems</h3>
            <p className="mt-2 text-xs text-stone-600 leading-relaxed">Citizen login is required to submit a report and receive an account-linked Tracking ID.</p>
            <Link to="/report" className="mt-4 inline-flex text-xs font-bold text-orange-700 hover:text-orange-800">Open Report Form</Link>
          </div>

          <div className="p-6 rounded border border-stone-200 bg-white shadow-xs">
            <Handshake className="w-6 h-6 text-blue-600" />
            <h3 className="mt-4 text-base font-bold text-stone-900">Donation Proof</h3>
            <p className="mt-2 text-xs text-stone-600 leading-relaxed">Citizen login is required. Submitted proof remains private and Pending until an Admin verifies or rejects it.</p>
            <Link to="/submit-donation-proof" className="mt-4 inline-flex text-xs font-bold text-blue-700 hover:text-blue-800">Submit Donation Proof</Link>
          </div>

          <div className="p-6 rounded border border-stone-200 bg-white shadow-xs">
            <HelpCircle className="w-6 h-6 text-emerald-600" />
            <h3 className="mt-4 text-base font-bold text-stone-900">Platform Help</h3>
            <p className="mt-2 text-xs text-stone-600 leading-relaxed">Review the knowledge base for reporting, tracking, duplicate handling, donation verification and privacy information.</p>
            <Link to="/faq" className="mt-4 inline-flex text-xs font-bold text-emerald-700 hover:text-emerald-800">Consult Knowledge Base</Link>
          </div>
        </div>
      </div>
    </section>

    <CTA />
  </div>
);
