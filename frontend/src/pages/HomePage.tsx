import React, { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Search, 
  AlertTriangle, 
  Droplet, 
  Trash2, 
  Wrench, 
  ShieldCheck, 
  ArrowUpRight,
  UserCircle,
  HardHat,
  Shield,
} from 'lucide-react';
import { SectionHeading } from '../components/common/SectionHeading';
import { WorkflowTimeline } from '../components/common/WorkflowTimeline';
import { CTA } from '../components/common/CTA';
import { EmptyState } from '../components/common/EmptyState';
import { ASSETS, responsiveImageProps } from '../constants/assets';

const HammerImpactScene = lazy(() => import('../components/home/HammerImpactScene').then((module) => ({ default: module.HammerImpactScene })));

export const HomePage: React.FC = () => {
  const [quickTrackId, setQuickTrackId] = useState('');

  const civicProblems = [
    {
      icon: Wrench,
      title: 'Damaged Roads & Potholes',
      desc: 'Dangerous asphalt craters, fractured road beds, open culverts, and hazards affecting vehicles, ambulances, and daily pedestrian safety.',
      accent: 'border-l-orange-500',
    },
    {
      icon: Droplet,
      title: 'Water & Civic Sanitation',
      desc: 'Ruptured supply pipelines, stagnant sewage pooling, overflowing manholes, and contaminated drainage threatening public hygiene.',
      accent: 'border-l-sky-500',
    },
    {
      icon: Trash2,
      title: 'Waste & Community Cleanliness',
      desc: 'Uncollected refuse dumps, hazardous debris obstructing public thoroughfares, and neglected neighborhood waste heaps.',
      accent: 'border-l-amber-500',
    },
    {
      icon: AlertTriangle,
      title: 'Community Infrastructure Hazards',
      desc: 'Uncovered electrical conduits, crumbling neighborhood pavements, broken street fixtures, and urgent community access risks.',
      accent: 'border-l-stone-700',
    },
  ];

  const featuredInitiatives = [
    {
      title: 'FixIt Family Home',
      category: 'Children & Education',
      desc: 'A dedicated residential environment providing orphaned children with safety, education, personal mentorship, and dignified care.',
      image: ASSETS.projectFamilyHome,
      link: '/our-work',
    },
    {
      title: 'FixIt Skills Centre',
      category: 'Youth Employability',
      desc: 'Practical technical and digital education in Artificial Intelligence, Web Development, SEO, and modern employability trades.',
      image: ASSETS.projectSkillsCentre,
      link: '/our-work',
    },
    {
      title: 'FixIt Kitchen',
      category: 'Food Security',
      desc: 'Serving hygienic and affordable meals with an unyielding emphasis on human dignity rather than presenting beneficiaries as charity cases.',
      image: ASSETS.heroCivicAction,
      link: '/our-work',
    },
    {
      title: 'Clean Water Project',
      category: 'Water Access',
      desc: 'Installation of robust community water wells and sustainable pumping solutions for water-scarce rural and peri-urban settlements.',
      image: ASSETS.projectWaterWell,
      link: '/our-work',
    },
    {
      title: 'Civic Road Repair',
      category: 'Civic Action',
      desc: 'Our signature ground-level emergency asphalt repair crews resolving severe community potholes and dangerous thoroughfares.',
      image: ASSETS.projectRoadRepair,
      link: '/our-work',
    },
  ];

  return (
    <div className="w-full">
      {/* ========================================================================= */}
      {/* SECTION A: HERO */}
      {/* ========================================================================= */}
      <section className="relative civic-noise bg-stone-950 text-white overflow-hidden border-b border-stone-800">
        {/* Subtle background civic grid texture */}
        <div className="absolute inset-0 civic-grid-dark opacity-35 pointer-events-none" />
        
        {/* Subtle ambient orange flare */}
        <div className="absolute -top-32 -right-32 w-[34rem] h-[34rem] bg-orange-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-[6%] top-0 h-full w-px bg-orange-500/20" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 right-0 h-px road-marking opacity-60" aria-hidden="true" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Hero Copy */}
            <div className="lg:col-span-7 space-y-7 section-reveal">
              <div className="flex items-center gap-2 editorial-rule">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-xs font-bold uppercase tracking-widest text-orange-400">
                  Citizen Problem & Donation Tracking System
                </span>
              </div>

              <h1
                className="text-5xl sm:text-6xl lg:text-[5.35rem] font-black tracking-[-0.065em] text-white leading-[0.88]"
                style={{ textWrap: 'balance' }}
              >
                See a Problem.<br />
                <span className="relative inline-block text-orange-500">Report It.<span className="absolute -right-4 top-1 h-2 w-2 rounded-full bg-orange-500" aria-hidden="true" /></span><br />
                Track the Fix.
              </h1>

              <p className="text-base sm:text-lg text-stone-300 leading-relaxed max-w-xl">
                Authenticated Citizens can report community infrastructure hazards, receive a Tracking ID, and follow the status of reports linked to their account.
              </p>

              {/* Primary Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Link
                  to="/report"
                  className="civic-button-primary inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold text-white bg-orange-600 hover:bg-orange-500 rounded transition-colors whitespace-nowrap"
                >
                  <span>Report a Problem</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/track"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-stone-200 hover:text-white bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded transition-colors whitespace-nowrap"
                >
                  <Search className="w-4 h-4 text-orange-400" />
                  <span>Track Your Report</span>
                </Link>
              </div>

              {/* Quick Tracker Input */}
              <div className="pt-4 border-t border-stone-800/80">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (quickTrackId.trim()) {
                      window.location.href = `/track?id=${encodeURIComponent(quickTrackId.trim())}`;
                    }
                  }}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-md"
                >
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Enter your Tracking ID"
                      value={quickTrackId}
                      onChange={(e) => setQuickTrackId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-700 rounded text-xs font-mono text-white placeholder-stone-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded border border-stone-700 transition-colors whitespace-nowrap flex items-center justify-center gap-1.5"
                  >
                    <span>Lookup</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Decorative, isolated interaction: no workflow or API side effects. */}
            <div className="lg:col-span-5">
              <Suspense fallback={<div className="hammer-experience hammer-experience--loading" aria-label="Loading interactive civic repair visual" />}>
                <HammerImpactScene />
              </Suspense>
            </div>
          </div>

          {/* Workflow Ribbon */}
          <div className="mt-16 rounded-xl border border-stone-800 bg-stone-950/60 p-5 sm:p-7 backdrop-blur-sm">
            <div className="civic-label text-stone-400 mb-6 editorial-rule">
              Transparent Operational Lifecycle
            </div>
            <WorkflowTimeline mode="compact" />
          </div>
        </div>
      </section>

      {/* Role map: presentation only; access rules remain enforced by existing guards. */}
      <section className="border-b border-stone-200 bg-[#faf8f2] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="One Platform · Three Roles"
            title="Clear responsibility at every step."
            subtitle="Citizens surface the problem, coordinators organize field action, and administrators protect the integrity of every decision."
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { label: 'Citizen', title: 'Report & Track', note: 'Submit verified reports and follow their progress.', icon: UserCircle, code: '01' },
              { label: 'Coordinator', title: 'Manage Field Work', note: 'Schedule action and record required evidence.', icon: HardHat, code: '02' },
              { label: 'Admin', title: 'Verify & Approve', note: 'Review reports, finances, and final decisions.', icon: Shield, code: '03' },
            ].map((role) => {
              const Icon = role.icon;
              return (
                <article key={role.label} className="civic-card group relative overflow-hidden bg-white p-6 sm:p-7">
                  <div className="absolute right-0 top-0 h-16 w-16 border-b border-l border-stone-200 bg-stone-50 text-center font-mono text-[10px] leading-[4rem] text-stone-400 group-hover:bg-orange-50 group-hover:text-orange-600">{role.code}</div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-stone-950 text-orange-400 shadow-lg"><Icon className="h-5 w-5" /></div>
                  <div className="civic-label mt-7 text-orange-600">{role.label}</div>
                  <h3 className="mt-2 text-2xl font-bold text-stone-950">{role.title}</h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-stone-600">{role.note}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION B: HOW FIXIT WORKS */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="System Architecture"
            title="How the FixIt Platform Works"
            subtitle="From citizen submission to ground completion, every step is systematically tracked, reviewed by human operations coordinators, and backed by verifiable proof of work."
            action={
              <Link
                to="/how-it-works"
                className="inline-flex items-center gap-1 text-sm font-bold text-orange-600 hover:text-orange-700"
              >
                <span>Full 9-Step Process</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded border border-stone-200 bg-stone-50/50 hover:border-orange-300 transition-colors">
              <div className="w-10 h-10 rounded bg-orange-100 border border-orange-200 text-orange-600 flex items-center justify-center font-bold font-mono mb-4">
                01
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-2">
                1. Citizen Reports
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Sign in as a Citizen, capture the report location, attach a required photo, and receive a Tracking ID linked to your account.
              </p>
            </div>

            <div className="p-6 rounded border border-stone-200 bg-stone-50/50 hover:border-orange-300 transition-colors">
              <div className="w-10 h-10 rounded bg-stone-900 text-white flex items-center justify-center font-bold font-mono mb-4">
                02
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-2">
                2. Advisory AI & Human Review
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Reports of the same category within 100m of an active report are marked Possible Duplicate. AI triage is advisory; an Admin decides whether to approve, reject, or merge.
              </p>
            </div>

            <div className="p-6 rounded border border-stone-200 bg-stone-50/50 hover:border-orange-300 transition-colors">
              <div className="w-10 h-10 rounded bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold font-mono mb-4">
                03
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-2">
                3. On-Ground Fix & Proof
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Coordinators schedule repairs. Field crews resolve the problem and upload photographic Before & After evidence before marking the issue Solved.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION C: PROBLEMS WE HELP ADDRESS */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 bg-stone-50 border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Scope of Action"
            title="Problems We Help Address"
            subtitle="Citizens encounter broken municipal infrastructure daily. FixIt focuses community effort on practical, visible civic remedies."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {civicProblems.map((prob, idx) => {
              const Icon = prob.icon;
              return (
                <div
                  key={idx}
                  className={`rounded border border-stone-200 bg-white p-6 shadow-xs flex flex-col justify-between border-l-4 ${prob.accent}`}
                >
                  <div>
                    <div className="w-10 h-10 rounded bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-800 mb-4">
                      <Icon className="w-5 h-5 text-orange-600" />
                    </div>
                    <h3 className="text-base font-bold text-stone-900 mb-2">
                      {prob.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                      {prob.desc}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-stone-100">
                    <Link
                      to="/report"
                      className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700"
                    >
                      <span>Report This Issue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION E: TRANSPARENCY (NO FAKE NUMBERS) */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 bg-stone-900 text-white border-b border-stone-800 relative overflow-hidden">
        <div className="absolute inset-0 civic-grid-dark opacity-20 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Radical Civic Accountability"
            title="Public Transparency & Auditability"
            subtitle="Public Transparency shows aggregate Verified donation totals, aggregate Approved spending totals, and safe completed-work summaries. Private proofs, receipts, identities, and exact locations are not published."
            variant="dark"
            action={
              <Link
                to="/transparency"
                className="inline-flex items-center gap-1 text-sm font-bold text-orange-400 hover:text-orange-300"
              >
                <span>Transparency Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded border border-stone-800 bg-stone-950/80 p-6 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-orange-400 mb-2">
                  Verified Donations
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Bank-Reconciled Funds
                </h3>
                <p className="text-xs text-stone-400 leading-relaxed mb-6">
                  Only donations marked Verified by an Admin are included in the public aggregate total.
                </p>
              </div>
              <div className="p-4 rounded bg-stone-900 border border-stone-800 text-center">
                <span className="text-xs font-mono text-stone-400">
                  View the current aggregate total in the Transparency Portal.
                </span>
              </div>
            </div>

            <div className="rounded border border-stone-800 bg-stone-950/80 p-6 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-orange-400 mb-2">
                  Approved Spending
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Approved Aggregate
                </h3>
                <p className="text-xs text-stone-400 leading-relaxed mb-6">
                  Only expenses marked Approved by an Admin are included in the public aggregate total.
                </p>
              </div>
              <div className="p-4 rounded bg-stone-900 border border-stone-800 text-center">
                <span className="text-xs font-mono text-stone-400">
                  Private receipts and individual expense records are not published.
                </span>
              </div>
            </div>

            <div className="rounded border border-stone-800 bg-stone-950/80 p-6 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 mb-2">
                  Solved Reports
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Completed Public Works
                </h3>
                <p className="text-xs text-stone-400 leading-relaxed mb-6">
                  Safe summaries of reports with the exact backend status Solved, without private media or exact locations.
                </p>
              </div>
              <div className="p-4 rounded bg-stone-900 border border-stone-800 text-center">
                <span className="text-xs font-mono text-stone-400">
                  View current completed-work summaries in the Transparency Portal.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION F: MORE THAN FIXING ROADS (OUR WORK PREVIEW) */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Social Impact Ecosystem"
            title="More Than Fixing Roads"
            subtitle="FixIt's organizational mission extends far beyond civic problem reporting. We invest in children, vocational education, clean water, dignified food access, and community relief across Pakistan."
            action={
              <Link
                to="/our-work"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded transition-colors"
              >
                <span>Explore All Initiatives</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredInitiatives.map((item, idx) => (
              <div
                key={idx}
                className="rounded border border-stone-200 bg-white overflow-hidden hover:border-orange-400 transition-colors flex flex-col justify-between shadow-xs group"
              >
                <div>
                  <div className="relative aspect-16/10 bg-stone-100 overflow-hidden">
                    <img
                      {...responsiveImageProps(item.image, '(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw')}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute top-3 left-3 bg-stone-900/90 text-white text-xs font-medium px-2 py-0.5 rounded">
                      {item.category}
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="text-lg font-bold text-stone-900 group-hover:text-orange-600 transition-colors">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <Link
                    to={item.link}
                    className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700"
                  >
                    <span>Learn More</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION G: UPCOMING COMMUNITY WORK PREVIEW (SKELETON / EMPTY STATE) */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-20 bg-stone-50 border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Dispatch Schedule"
            title="Upcoming Community Work"
            subtitle="Scheduled field operations appear here to notify residents of planned repairs and potential short-term traffic or utility disruptions."
            action={
              <Link
                to="/upcoming-work"
                className="inline-flex items-center gap-1 text-xs font-bold text-stone-700 hover:text-stone-900"
              >
                <span>Full Schedule View</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            }
          />

          <EmptyState
            title="View the Current Field Work Schedule"
            description="The Upcoming Work page shows backend-supported scheduled work details without exact GPS coordinates or private addresses."
            note="Strict privacy protection: Exact GPS coordinates and private addresses are never published."
            action={
              <Link
                to="/report"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded"
              >
                <span>Report a Problem in Your Area</span>
              </Link>
            }
          />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION H: STRONG CLOSING CTA */}
      {/* ========================================================================= */}
      <CTA />
    </div>
  );
};
