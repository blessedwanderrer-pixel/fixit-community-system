import React from 'react';
import { Link } from 'react-router-dom';
import { PageHero } from '../components/common/PageHero';
import { SectionHeading } from '../components/common/SectionHeading';
import { CTA } from '../components/common/CTA';
import { 
  ArrowRight, 
  ShieldCheck, 
  Users, 
  Award, 
  Target, 
  Layers, 
  Sparkles, 
  CheckCircle2,
  Cpu,
  Heart,
  BookOpen,
  Droplet,
  Utensils,
  Wrench,
  Activity,
  Briefcase
} from 'lucide-react';
import { ASSETS } from '../constants/assets';

export const AboutPage: React.FC = () => {
  const evolutionPhases = [
    {
      phase: '01',
      title: 'Civic Activism',
      desc: 'Highlighting everyday civic neglect in Pakistan—most famously spray-painting neglected potholes and open sewer manholes to demand administrative accountability.',
    },
    {
      phase: '02',
      title: 'Community Action',
      desc: 'Moving from critique to direct physical solutions: mobilizing volunteers, asphalt, tools, and machinery to repair damaged roads and restore public safety directly.',
    },
    {
      phase: '03',
      title: 'Social Welfare',
      desc: 'Expanding into essential human support: founding the FixIt Family Home for orphaned youth, FixIt Kitchen for dignified affordable food, and clean water wells.',
    },
    {
      phase: '04',
      title: 'Education & Employability Skills',
      desc: 'Establishing the FixIt Skills Centre to provide youth with high-demand digital capabilities including Artificial Intelligence, Web Development, SEO, and technical trades.',
    },
    {
      phase: '05',
      title: 'Transparency & Digital Participation',
      desc: 'Launching this new digital reporting and donation tracking system to give every citizen a direct tool for reporting, tracking, and auditing verified community impact.',
      isNewPlatform: true,
    },
  ];

  const workAreas = [
    {
      title: 'Road Repairing',
      desc: 'Repairing dangerous potholes, reinforcing broken roads, and improving street safety across urban and peri-urban thoroughfares.',
      icon: Wrench,
      accent: 'border-orange-500',
    },
    {
      title: 'FixIt Family Home',
      desc: 'Supporting orphaned children with a safe, nurturing home environment, quality education, and long-term personal development.',
      icon: Heart,
      accent: 'border-rose-500',
    },
    {
      title: 'FixIt Kitchen',
      desc: 'Providing hygienic, affordable meals designed to support families while fiercely protecting their human dignity.',
      icon: Utensils,
      accent: 'border-amber-500',
    },
    {
      title: 'FixIt Skills Centre',
      desc: 'Practical technical education spanning Artificial Intelligence, web development, SEO, digital marketing, and tech trades for youth.',
      icon: BookOpen,
      accent: 'border-blue-500',
    },
    {
      title: 'Water Well Project',
      desc: 'Installing clean drinking water wells and reliable extraction pumps in water-deprived rural and marginalized communities.',
      icon: Droplet,
      accent: 'border-sky-500',
    },
    {
      title: 'Community Health',
      desc: 'Public health campaigns including neighborhood mosquito fumigation, sanitation drives, and preventive health awareness.',
      icon: Activity,
      accent: 'border-emerald-500',
    },
    {
      title: 'Livelihood & Relief',
      desc: 'Rozgar livelihood empowerment programs, ration packages for vulnerable families, and emergency crisis relief operations.',
      icon: Briefcase,
      accent: 'border-purple-500',
    },
  ];

  return (
    <div className="w-full">
      <PageHero
        kicker="Citizen-Led Movement"
        title="From Street-Level Accountability to Practical Community Solutions"
        subtitle="FixIt began as a courageous citizen campaign confronting everyday civic breakdown in Pakistan. Today, it stands as an action-driven volunteer movement addressing infrastructure, welfare, youth education, and radical transparency."
        breadcrumbs={[{ label: 'About Us' }]}
        actionPrimary={{ label: 'Report a Problem', href: '/report' }}
        actionSecondary={{ label: 'Our Work Portfolio', href: '/our-work' }}
      />

      {/* ========================================================================= */}
      {/* SECTION: HOW IT STARTED */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-600" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-orange-600">
                  Origins & Philosophy
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight leading-tight">
                How It Started: A Movement Built on Direct Civic Action
              </h2>

              <p className="text-base text-stone-700 leading-relaxed">
                FixIt began in Karachi as a grassroots, citizen-led campaign highlighting everyday municipal negligence. Citizens were tired of navigating dangerous unpaved craters, contaminated open gutters, and broken civic infrastructure with no accountability.
              </p>

              <p className="text-base text-stone-700 leading-relaxed">
                Rather than staying silent, volunteers used stencil spray art on broken streets and open manholes to command public attention and hold authorities accountable. That viral civic protest rapidly matured into a hands-on, volunteer-driven operational organization that takes direct responsibility for repairing roads, protecting children, and uplifting underserved communities.
              </p>

              <div className="p-4 rounded border-l-4 border-orange-500 bg-stone-50 text-stone-800 text-sm">
                <strong className="text-stone-900">The Core Conviction:</strong> Citizens should not simply wait passively for change. When institutions fail, communities must organize, demand accountability, and take tangible corrective action with their own hands.
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative group max-w-md mx-auto lg:max-w-none">
                <div
                  className="absolute -inset-2 bg-gradient-to-tr from-stone-200 via-orange-100/50 to-stone-100 rounded-lg -rotate-1 opacity-70 group-hover:rotate-0 transition-transform duration-300 pointer-events-none"
                  aria-hidden="true"
                />
                <div className="relative rounded-lg border border-stone-300 bg-white p-3.5 sm:p-5 shadow-xl">
                  <div className="text-[11px] font-mono text-stone-500 pb-3 mb-3 border-b border-stone-100">
                    <span className="font-bold tracking-wider text-orange-600 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-600" />
                      FIXIT COMMUNITY ACTION
                    </span>
                  </div>
                  <div className="relative aspect-square w-full rounded bg-stone-50 overflow-hidden border border-stone-200 flex items-center justify-center">
                    <img src={ASSETS.heroCivicAction} alt="FixIt community volunteers at work" className="w-full h-full object-cover" />
                  </div>
                  <div className="pt-3.5 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-600 shrink-0" />
                      <h4 className="text-sm font-bold text-stone-900 tracking-tight">
                        Community action
                      </h4>
                    </div>
                    <p className="text-xs text-stone-500 leading-relaxed pl-3.5">
                      Community in Action: Standing shoulder-to-shoulder for practical civic solutions, human dignity, and ground-level accountability across Pakistan.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION: FOUNDER & LEADERSHIP */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 bg-stone-50 border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Organizational Leadership"
            title="Leadership Driven by Civic Courage"
            subtitle="FixIt was founded on the conviction that everyday citizens hold the right and duty to demand accountability and pioneer tangible solutions."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Founder: Alamgir Khan */}
            <div className="rounded border border-stone-200 bg-white p-6 sm:p-8 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded bg-orange-100 border border-orange-200 text-orange-600 flex items-center justify-center font-bold text-lg mb-4">
                  AK
                </div>
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-orange-600 mb-1">
                  Founder & Chairman
                </div>
                <h3 className="text-2xl font-bold text-stone-900">
                  Alamgir Khan
                </h3>
                <div className="text-xs text-stone-500 mb-4">FixIt Pakistan</div>

                <p className="text-sm text-stone-700 leading-relaxed">
                  Alamgir Khan launched FixIt with the belief that citizens should not simply wait for governance to improve from above, but must actively challenge municipal neglect and build working civic solutions on the ground.
                </p>

                <p className="mt-3 text-sm text-stone-700 leading-relaxed">
                  His vision transformed a local street protest into a multifaceted national welfare and infrastructure initiative that has inspired thousands of Pakistani youth to participate directly in community service.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-stone-100 text-xs font-mono text-stone-500">
                FixIt Pakistan Leadership
              </div>
            </div>

            {/* Co-Founder: Syed Muhammad Taha */}
            <div className="rounded border border-stone-200 bg-white p-6 sm:p-8 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded bg-stone-100 border border-stone-200 text-stone-700 flex items-center justify-center font-bold text-lg mb-4">
                  ST
                </div>
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Co-Founder
                </div>
                <h3 className="text-2xl font-bold text-stone-900">
                  Syed Muhammad Taha
                </h3>
                <div className="text-xs text-stone-500 mb-4">FixIt Pakistan</div>

                <p className="text-sm text-stone-700 leading-relaxed">
                  Syed Muhammad Taha co-founded FixIt, playing a central role in organizing ground-level volunteer networks, coordinating emergency civic responses, and expanding FixIt's operational footprint across key urban corridors.
                </p>

                <p className="mt-3 text-sm text-stone-700 leading-relaxed">
                  His work helped establish structured welfare programs alongside civic activism, institutionalizing FixIt's commitment to youth welfare, community health, and long-term social impact.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-stone-100 text-xs font-mono text-stone-500">
                FixIt Pakistan Co-Founder
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION: MISSION & CORE VALUES */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Our Mission & Principles"
            title="What FixIt Stands For"
            subtitle="FixIt exists to translate civic frustration into organized, dignified, and transparent community action."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded border border-stone-200 bg-stone-50/50">
              <h3 className="text-lg font-bold text-stone-900 mb-2">
                Practical Community Action
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Prioritizing real, visible intervention over empty rhetoric. When a road is broken, we mobilize materials to fix it.
              </p>
            </div>

            <div className="p-6 rounded border border-stone-200 bg-stone-50/50">
              <h3 className="text-lg font-bold text-stone-900 mb-2">
                Human Dignity
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                In all food, education, and welfare operations, beneficiaries are treated with complete respect and autonomy, never as subservient charity recipients.
              </p>
            </div>

            <div className="p-6 rounded border border-stone-200 bg-stone-50/50">
              <h3 className="text-lg font-bold text-stone-900 mb-2">
                Institutional Accountability
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Refusing to accept civic dysfunction as permanent. Documenting community hazards publicly to keep civic authorities responsive.
              </p>
            </div>

            <div className="p-6 rounded border border-stone-200 bg-stone-50/50">
              <h3 className="text-lg font-bold text-stone-900 mb-2">
                Radical Transparency
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Ensuring every donation and completed work order is open to citizen scrutiny with verified proof of work and bank reconciliation.
              </p>
            </div>

            <div className="p-6 rounded border border-stone-200 bg-stone-50/50">
              <h3 className="text-lg font-bold text-stone-900 mb-2">
                Citizen Participation
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Empowering everyday residents to actively identify problems, track their resolution, and participate in community improvement.
              </p>
            </div>

            <div className="p-6 rounded border border-stone-200 bg-stone-50/50">
              <h3 className="text-lg font-bold text-stone-900 mb-2">
                Underserved Communities First
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Focusing volunteer labor and welfare resources where municipal services are slowest to respond and vulnerabilities are highest.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION: EVOLUTION OF FIXIT */}
      {/* ========================================================================= */}
      <section id="evolution" className="py-16 sm:py-24 bg-stone-900 text-white border-b border-stone-800 relative overflow-hidden">
        <div className="absolute inset-0 civic-grid-dark opacity-20 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Trajectory of Impact"
            title="The Evolution of FixIt"
            subtitle="How a grassroots street movement expanded systematically from highlighting potholes to running children's homes, vocational institutes, clean water projects, and our new digital civic tracking platform."
            variant="dark"
          />

          <div className="space-y-4 max-w-4xl">
            {evolutionPhases.map((phase, idx) => (
              <div
                key={phase.phase}
                className={`p-6 rounded border transition-all ${
                  phase.isNewPlatform
                    ? 'border-orange-500 bg-stone-950/90 shadow-lg'
                    : 'border-stone-800 bg-stone-900/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        phase.isNewPlatform
                          ? 'bg-orange-600 text-white'
                          : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      PHASE {phase.phase}
                    </span>
                    <h3 className="text-lg font-bold text-white">
                      {phase.title}
                    </h3>
                  </div>

                  {phase.isNewPlatform && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-400 bg-orange-950/70 border border-orange-800 px-2.5 py-1 rounded">
                      <Sparkles className="w-3.5 h-3.5" />
                      NEW DIGITAL PLATFORM
                    </span>
                  )}
                </div>

                <p className="text-sm text-stone-300 leading-relaxed">
                  {phase.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 rounded bg-stone-950 border border-stone-800 text-xs text-stone-400 max-w-4xl">
            <span className="font-bold text-stone-200">Platform Scope Clarification:</span> FixIt has operated established physical initiatives across Pakistan for years. The digital problem reporting and donation verification system presented on this website is our newly introduced civic technology platform, engineered to scale community reporting and proof-of-work transparency.
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION: FROM CIVIC ACTION TO SOCIAL IMPACT (AREAS OF WORK) */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 bg-stone-50 border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Comprehensive Portfolio"
            title="From Civic Action to Social Impact"
            subtitle="A structured overview of FixIt's established organizational initiatives across Pakistan."
            action={
              <Link
                to="/our-work"
                className="inline-flex items-center gap-1 text-sm font-bold text-orange-600 hover:text-orange-700"
              >
                <span>View Project Showcase</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workAreas.map((area, idx) => {
              const Icon = area.icon;
              return (
                <div
                  key={idx}
                  className={`p-6 rounded border border-stone-200 bg-white shadow-xs border-l-4 ${area.accent}`}
                >
                  <div className="w-10 h-10 rounded bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-800 mb-4">
                    <Icon className="w-5 h-5 text-orange-600" />
                  </div>
                  <h3 className="text-base font-bold text-stone-900 mb-2">
                    {area.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                    {area.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <CTA />
    </div>
  );
};
