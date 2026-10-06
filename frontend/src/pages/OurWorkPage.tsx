import React, { useState } from 'react';
import { PageHero } from '../components/common/PageHero';
import { SectionHeading } from '../components/common/SectionHeading';
import { ProjectCard, ProjectData } from '../components/common/ProjectCard';
import { CTA } from '../components/common/CTA';
import { ASSETS } from '../constants/assets';
import { 
  ArrowRight, 
  X, 
  CheckCircle2, 
  Layers, 
  ShieldCheck, 
  Building2, 
  HeartHandshake 
} from 'lucide-react';

export const ALL_PROJECTS: ProjectData[] = [
  {
    id: 'road-repairing',
    title: 'Road Repairing & Infrastructure',
    category: 'Civic Action',
    tagline: 'Emergency pothole repair and road leveling to protect community commuters.',
    description: 'FixIt’s iconic civic repair crews mobilize base aggregate, hot/cold asphalt patch material, and compaction equipment to eliminate hazardous craters and road depressions across active transit thoroughfares.',
    keyPillars: [
      'Hazardous pothole identification and rapid leveling',
      'Community transit safety for motorcycles, ambulances, and commuters',
      'Citizen-driven street problem resolution without waiting for bureaucracy',
    ],
    imageUrl: ASSETS.projectRoadRepair,
    featured: true,
  },
  {
    id: 'family-home',
    title: 'FixIt Family Home',
    category: 'Children & Education',
    tagline: 'Safe, dignified residential care, education, and mentorship for orphaned youth.',
    description: 'A comprehensive residential development center providing orphaned children with a secure family atmosphere, formal schooling, nutritional care, emotional guidance, and long-term vocational opportunities.',
    keyPillars: [
      'Safe residential environment and holistic daily care',
      'Formal academic enrollment and after-school tutoring',
      'Character development, life skills, and recreational activities',
    ],
    imageUrl: ASSETS.projectFamilyHome,
    featured: true,
  },
  {
    id: 'skills-centre',
    title: 'FixIt Skills Centre',
    category: 'Children & Education',
    tagline: 'Practical digital and technical education equipping youth for modern employment.',
    description: 'Empowering Pakistani youth with hands-on computer laboratories and real-world tech instruction designed to bridge the employability gap and foster freelance and tech career opportunities.',
    keyPillars: [
      'Artificial Intelligence & Prompt Engineering foundations',
      'Web Development & Modern Frontend/Backend frameworks',
      'Digital Marketing, SEO, E-Commerce, and Data Fundamentals',
    ],
    imageUrl: ASSETS.projectSkillsCentre,
    featured: true,
  },
  {
    id: 'water-well',
    title: 'Water Well Project',
    category: 'Water & Health',
    tagline: 'Clean water solutions for rural and peri-urban water-scarce communities.',
    description: 'Deep-bore drinking water wells, community hand pumps, and solar-powered pumping systems installed in arid villages across Sindh and vulnerable regions facing severe water shortages.',
    keyPillars: [
      'Clean, potable drinking water directly within village settlements',
      'Alleviating hours of daily water-carrying burdens for women and families',
      'Sustainable pump maintenance mechanisms run with community elders',
    ],
    imageUrl: ASSETS.projectWaterWell,
    featured: true,
  },
  {
    id: 'fixit-kitchen',
    title: 'FixIt Kitchen',
    category: 'Food & Livelihood',
    tagline: 'Nutritious, affordable daily meals delivered with dignity.',
    description: 'A community food program providing freshly prepared, wholesome meals to working laborers, daily-wage earners, and vulnerable families, deliberately structured to preserve human self-respect.',
    keyPillars: [
      'Strict food hygiene standards and quality ingredients',
      'Dignified dining model rather than demeaning handout queues',
      'Consistent daily food access for daily-wage workers',
    ],
    imageUrl: ASSETS.heroCivicAction,
    featured: false,
  },
  {
    id: 'community-health',
    title: 'Community Health & Fumigation',
    category: 'Water & Health',
    tagline: 'Vector control, neighborhood fumigation, and civic sanitation awareness.',
    description: 'Targeted mosquito-control fumigation campaigns across dense urban settlements during monsoon season to mitigate dengue and malaria risks, paired with hygiene awareness.',
    keyPillars: [
      'Monsoon anti-dengue and malaria fumigation drives',
      'Stagnant water mitigation and civic drainage sanitization',
      'Neighborhood public health and hygiene information',
    ],
    imageUrl: ASSETS.heroCivicAction,
    featured: false,
  },
  {
    id: 'rozgar-livelihood',
    title: 'Rozgar / Livelihood Support',
    category: 'Food & Livelihood',
    tagline: 'Small business tools and sustainable income-generating equipment.',
    description: 'Providing sustainable livelihood assets—such as pushcarts, sewing machines, and small trade inventory—to help families achieve financial independence and break generational poverty.',
    keyPillars: [
      'Asset-based micro-enterprise support (no predatory debt)',
      'Mentorship in trade management and basic budgeting',
      'Focus on breadwinners with dependents and disabled family members',
    ],
    imageUrl: ASSETS.projectSkillsCentre,
    featured: false,
  },
  {
    id: 'ration-support',
    title: 'Ration & Food Assistance',
    category: 'Food & Livelihood',
    tagline: 'Monthly essential grocery staples for widows and destitute families.',
    description: 'Discreet distribution of essential monthly food provisions—flour, rice, pulses, cooking oil, tea, and dry goods—to thoroughly vetted households experiencing extreme financial crisis.',
    keyPillars: [
      'Carefully vetted household assessment prioritizing widows and elderly',
      'Complete nutritional staples packaged for a family for 30 days',
      'Discreet, confidential delivery respecting beneficiary privacy',
    ],
    imageUrl: ASSETS.heroCivicAction,
    featured: false,
  },
  {
    id: 'disaster-relief',
    title: 'Disaster & Emergency Relief',
    category: 'Relief',
    tagline: 'Rapid volunteer mobilization during floods, urban inundations, and national crises.',
    description: 'Emergency response operations during severe environmental disasters across Pakistan, deploying volunteer rescue boats, dry rations, clean water containers, and temporary shelter kits.',
    keyPillars: [
      'Rapid mobilization of on-ground volunteer rescue teams',
      'Emergency food, purified water, and shelter distribution',
      'Post-crisis community rehabilitation and hygiene recovery',
    ],
    imageUrl: ASSETS.projectWaterWell,
    featured: false,
  },
];

export const OurWorkPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [modalProject, setModalProject] = useState<ProjectData | null>(null);

  const categories = [
    'All',
    'Civic Action',
    'Children & Education',
    'Food & Livelihood',
    'Water & Health',
    'Relief',
  ];

  const filteredProjects = selectedCategory === 'All'
    ? ALL_PROJECTS
    : ALL_PROJECTS.filter((p) => p.category === selectedCategory);

  return (
    <div className="w-full">
      <PageHero
        kicker="Organizational Portfolio"
        title="FixIt Social Initiatives & Community Work"
        subtitle="Explore the breadth of FixIt's real-world operations across Pakistan: civic road repairs, residential child care, technology skills centers, clean water wells, dignified food security, and crisis relief."
        breadcrumbs={[{ label: 'Our Work' }]}
        badgeText="Established Organizational Programs"
        actionPrimary={{ label: 'Report a Civic Problem', href: '/report' }}
        actionSecondary={{ label: 'View Transparency', href: '/transparency' }}
      />

      {/* Organizational distinction callout */}
      <div className="bg-stone-100 border-b border-stone-200 py-3 px-4 text-center text-xs text-stone-600">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-orange-600 shrink-0" />
          <span>
            <strong>Organizational Programs Note:</strong> These established initiatives reflect FixIt Pakistan's broader social welfare programs and are managed alongside the new digital problem-reporting system.
          </span>
        </div>
      </div>

      {/* Featured Marquee Section: Road Repair & Skills Centre & Family Home */}
      <section className="py-16 sm:py-20 bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Pillar Initiatives"
            title="Signature Programs in Focus"
            subtitle="Three foundational areas where FixIt brings deep, visible community transformation."
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {ALL_PROJECTS.filter((p) => p.featured).slice(0, 3).map((feat) => (
              <div
                key={feat.id}
                className="rounded border border-stone-200 bg-stone-50/50 p-6 flex flex-col justify-between hover:border-orange-300 transition-colors"
              >
                <div>
                  <div className="aspect-16/10 rounded overflow-hidden mb-5">
                    <img
                      src={feat.imageUrl}
                      alt={feat.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="text-xs font-mono font-bold uppercase text-orange-600 mb-1">
                    {feat.category}
                  </div>
                  <h3 className="text-xl font-bold text-stone-900 mb-2">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-stone-600 leading-relaxed mb-4">
                    {feat.tagline}
                  </p>
                </div>

                <button
                  onClick={() => setModalProject(feat)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-900 hover:text-orange-600 pt-3 border-t border-stone-200"
                >
                  <span>Read Detailed Overview</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Category Navigation & Project Grid */}
      <section className="py-16 sm:py-24 bg-stone-50 border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-orange-600">
                  All 9 Initiative Domains
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                Explore FixIt Operations by Category
              </h2>
            </div>

            {/* Category Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-200/80 rounded">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-bold rounded transition-colors whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredProjects.map((proj) => (
              <ProjectCard
                key={proj.id}
                project={proj}
                onSelect={(selected) => setModalProject(selected)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Initiative Detail Modal */}
      {modalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white rounded border border-stone-300 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalProject(null)}
              className="absolute top-4 right-4 p-2 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-xs font-mono font-bold uppercase text-orange-600 mb-1">
              {modalProject.category}
            </div>

            <h3 className="text-2xl font-bold text-stone-900 mb-2">
              {modalProject.title}
            </h3>

            <p className="text-sm text-stone-600 italic mb-6">
              {modalProject.tagline}
            </p>

            <div className="aspect-16/9 rounded overflow-hidden mb-6 bg-stone-100">
              <img
                src={modalProject.imageUrl}
                alt={modalProject.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-4 text-sm text-stone-700 leading-relaxed">
              <p>{modalProject.description}</p>

              <div className="pt-4 border-t border-stone-200">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-500 mb-3">
                  Strategic Scope & Focus Areas:
                </h4>
                <ul className="space-y-2">
                  {modalProject.keyPillars.map((pillar, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-stone-800">
                      <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                      <span>{pillar}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-stone-200 flex items-center justify-between">
              <span className="text-xs text-stone-400">FixIt Pakistan Initiative</span>
              <button
                onClick={() => setModalProject(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <CTA />
    </div>
  );
};
