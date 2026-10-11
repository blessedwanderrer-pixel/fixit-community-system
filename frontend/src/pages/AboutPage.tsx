import React, { lazy, Suspense } from 'react';
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
import { ASSETS, responsiveImageProps } from '../constants/assets';

const CrackTheScreen = lazy(() => import('../components/about/CrackTheScreen').then((module) => ({ default: module.CrackTheScreen })));

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
                    <img {...responsiveImageProps(ASSETS.heroCivicAction, '(min-width: 1024px) 40vw, 100vw')} alt="FixIt community volunteers at work" className="w-full h-full object-cover" decoding="async" />
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

      {/* Decorative simulation only; it has no connection to reports or application state. */}
      <section className="experience-the-fix py-16 sm:py-24 border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Interactive Civic Experience"
            title="Experience the Fix"
            subtitle="Crack the surface, activate the repair, and watch a visible problem become a solution. This lightweight experience is illustrative and does not represent a real report or completed project."
            variant="dark"
          />
          <Suspense fallback={<div className="crack-screen crack-screen--loading" aria-label="Loading interactive repair demonstration" />}>
            <CrackTheScreen />
          </Suspense>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION: FOUNDER & LEADERSHIP */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 bg-stone-50 border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="The People Behind FixIt"
            title="Civic action, documented and delivered together."
            subtitle="Alamgir Khan, Adnan Khan, and Qazi Sheraz are recognized for their public activism, digital storytelling, and community-focused work associated with Pakistan's FixIt movement."
          />

          <figure className="civic-card image-frame relative mx-auto mb-8 max-w-5xl overflow-hidden rounded-xl bg-white p-2 sm:p-3">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-stone-100 sm:aspect-[16/10]">
              <img
                {...responsiveImageProps(ASSETS.teamPortrait, '(min-width: 1024px) 1024px, 100vw')}
                alt="Alamgir Khan, Adnan Khan, and Qazi Sheraz together in #FIXIT shirts"
                className="h-full w-full object-cover object-top"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950/90 via-stone-950/35 to-transparent px-5 pb-5 pt-20 sm:px-7 sm:pb-7">
                <figcaption className="text-sm font-semibold text-white sm:text-base">
                  Alamgir Khan · Adnan Khan · Qazi Sheraz
                </figcaption>
                <p className="mt-1 text-xs text-stone-300">Public activism, community action, and digital documentation</p>
              </div>
            </div>
          </figure>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {[
              {
                initials: 'AK',
                role: 'Founder · Public Activist',
                name: 'Alamgir Khan',
                description: 'Founder of the FixIt organization and a prominent Pakistani political activist. He gained nationwide recognition in 2016 through a campaign that placed portraits of the Sindh Chief Minister beside open manholes in Karachi to spotlight government neglect. He later served as a Member of the National Assembly from 2018 to 2023.',
              },
              {
                initials: 'AD',
                role: 'Activist · Entrepreneur',
                name: 'Adnan Khan',
                description: 'An activist, entrepreneur, and key member of the FixIt initiative. He collaborates with Alamgir Khan on regional efforts including FixIt Nowshera, documenting community welfare work, civic repairs, and public-service activities through digital media.',
              },
              {
                initials: 'QS',
                role: 'Digital Creator · Media Collaborator',
                name: 'Qazi Sheraz',
                description: 'A digital creator and media collaborator who works alongside Adnan Khan and Alamgir Khan. He helps document, film, and share their civic campaigns and community rescue operations across social media platforms.',
              },
            ].map((person, index) => (
              <article key={person.name} className="civic-card group relative flex flex-col overflow-hidden rounded-lg bg-white p-6 sm:p-7">
                <span className="absolute right-5 top-5 font-mono text-xs text-stone-300">0{index + 1}</span>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 font-bold text-orange-700">
                  {person.initials}
                </div>
                <div className="civic-label mt-6 text-orange-600">{person.role}</div>
                <h3 className="mt-2 text-2xl font-bold text-stone-950">{person.name}</h3>
                <p className="mt-4 flex-1 text-sm leading-7 text-stone-600">{person.description}</p>
                <div className="mt-6 h-1 w-10 bg-orange-500 transition-all duration-300 group-hover:w-20" aria-hidden="true" />
              </article>
            ))}
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
