import React from 'react';
import { PageHero } from '../components/common/PageHero';
import { SectionHeading } from '../components/common/SectionHeading';
import { FAQAccordion } from '../components/common/FAQAccordion';
import { CTA } from '../components/common/CTA';
import { useSearchParams } from 'react-router-dom';

export const FAQPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'All';

  return (
    <div className="w-full">
      <PageHero
        kicker="Citizen Knowledge Base"
        title="Frequently Asked Questions"
        subtitle="Clear, honest answers regarding how to report community issues, how Tracking IDs work, our advisory AI guardrails, donor privacy, and financial verification standards."
        breadcrumbs={[{ label: 'FAQ' }]}
        actionPrimary={{ label: 'Report a Problem', href: '/report' }}
        actionSecondary={{ label: 'Contact Helpdesk', href: '/contact' }}
      />

      <section className="py-16 sm:py-24 bg-stone-50 border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Categorized Guidance"
            title="Browse Platform Questions by Topic"
            subtitle="Select a category below to quickly find policies on reporting, status workflows, bank donation verification, and privacy protections."
          />

          <FAQAccordion initialCategory={initialCategory} showCategoryFilters={true} />
        </div>
      </section>

      <CTA />
    </div>
  );
};
