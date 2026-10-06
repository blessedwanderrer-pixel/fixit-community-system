import React, { useState } from 'react';
import { ChevronDown, HelpCircle, Shield, Cpu, Receipt, Eye } from 'lucide-react';

export interface FAQItem {
  id: string;
  category: 'Reporting' | 'Tracking' | 'Donations' | 'Privacy' | 'AI';
  question: string;
  answer: string;
}

export const DEFAULT_FAQS: FAQItem[] = [
  // Reporting Problems
  {
    id: 'rep-1',
    category: 'Reporting',
    question: 'How do I report a community problem?',
    answer: 'Sign in with a Citizen account and open "Report a Problem". Select a category, write a description, allow the browser to capture the real latitude and longitude, and attach a required JPEG, PNG, or WebP photo.',
  },
  {
    id: 'rep-2',
    category: 'Reporting',
    question: 'What is a Tracking ID and how do I use it?',
    answer: 'Every report generates a Tracking ID beginning with FIX-. Tracking is not public: sign in as a Citizen and enter an ID linked to your account to see its category, exact backend status, and safe progress dates or work details.',
  },
  {
    id: 'rep-3',
    category: 'Reporting',
    question: 'What happens immediately after submitting my report?',
    answer: 'The report starts with status Submitted. The backend checks for an active report in the same category within 100 metres and may mark it Possible Duplicate. Advisory AI prepares non-binding triage information, and an Admin decides whether to approve, reject, or merge.',
  },
  {
    id: 'rep-4',
    category: 'Reporting',
    question: 'What happens if someone has already reported the same issue?',
    answer: 'A same-category report within 100 metres of an active report is marked Possible Duplicate. Nothing is merged automatically. An Admin reviews the candidates and explicitly decides whether to merge; reporter access is preserved when a merge occurs.',
  },

  // Tracking Work
  {
    id: 'trk-1',
    category: 'Tracking',
    question: 'What do the different workflow statuses mean?',
    answer: '• Submitted: awaiting Admin review.\n• Approved: accepted and available for Coordinator scheduling.\n• Rejected: declined by an Admin.\n• Scheduled: assigned and scheduled by a Coordinator.\n• In Progress: work has started.\n• Solved: completed after Before and After evidence was recorded.\n• Cancelled: cancelled while the backend permitted it, or merged into another report.',
  },
  {
    id: 'trk-2',
    category: 'Tracking',
    question: 'How do I know when community work is completed?',
    answer: 'The assigned Coordinator must upload both Before and After evidence before changing the status from In Progress to Solved. The media remains private and is not displayed by authenticated tracking or public transparency.',
  },
  {
    id: 'trk-3',
    category: 'Tracking',
    question: 'Why are Before and After photos mandatory for resolved issues?',
    answer: 'The backend requires both stages before allowing the Solved transition. These private records support internal accountability; they are not published on the tracking or transparency pages.',
  },

  // Donations
  {
    id: 'don-1',
    category: 'Donations',
    question: 'How are community donations verified?',
    answer: 'When a citizen contributes via official FixIt bank or mobile accounts, they submit a reference receipt. Our finance team manually reconciles each transaction against official bank account statements. We never publish unverified financial figures.',
  },
  {
    id: 'don-2',
    category: 'Donations',
    question: 'Does uploading a payment screenshot automatically verify a donation?',
    answer: 'No. Uploading a screenshot initiates an audit request. FixIt human administrators inspect and verify the incoming bank record. We do not make false claims of instant automated Easypaisa or JazzCash verification.',
  },
  {
    id: 'don-3',
    category: 'Donations',
    question: 'What appears publicly on the Transparency page?',
    answer: 'Only the aggregate total of Verified donations, aggregate total of Approved spending, and safe completed-work summaries are public. Donor identities, individual transactions, expense line items, receipts, proof images and exact locations are not published.',
  },

  // Privacy
  {
    id: 'prv-1',
    category: 'Privacy',
    question: 'Is my exact GPS latitude and longitude displayed publicly?',
    answer: 'No. Public Transparency and Upcoming Work do not return coordinates, addresses, districts or zones. Standard Citizen responses also omit coordinates; authorized backend operations retain the submitted location for workflow and duplicate detection.',
  },
  {
    id: 'prv-2',
    category: 'Privacy',
    question: 'Are donor receipts and screenshots publicly viewable?',
    answer: 'No. Uploaded bank receipts, sender phone numbers, and transaction screenshots are strictly confidential. Only internal finance auditors review them to match statement entries. They are never published on the public web.',
  },
  {
    id: 'prv-3',
    category: 'Privacy',
    question: 'How are uploaded incident photos protected?',
    answer: 'Supported images are decoded, validated, re-encoded and stored privately. This removes embedded metadata such as EXIF. The system does not claim automatic face or license-plate blurring, so Citizens should avoid capturing unnecessary personal information.',
  },

  // AI
  {
    id: 'ai-1',
    category: 'AI',
    question: 'Does AI have the authority to approve or reject reports?',
    answer: 'No. AI triage is strictly advisory. It can summarize and suggest triage information, but an Admin makes approval, rejection and merge decisions. Duplicate candidates come from the separate same-category, active-report, 100-metre proximity check. Coordinators schedule approved work.',
  },
  {
    id: 'ai-2',
    category: 'AI',
    question: 'Why use AI in the civic workflow at all?',
    answer: 'Advisory AI gives Admin reviewers a structured second opinion while preserving human control. It cannot change a report status, merge reports, schedule work, or make a final decision.',
  },
];

interface FAQAccordionProps {
  initialCategory?: string;
  showCategoryFilters?: boolean;
  className?: string;
}

export const FAQAccordion: React.FC<FAQAccordionProps> = ({
  initialCategory = 'All',
  showCategoryFilters = true,
  className = '',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [openIds, setOpenIds] = useState<string[]>(['rep-1', 'ai-1']);

  const categories = ['All', 'Reporting', 'Tracking', 'Donations', 'Privacy', 'AI'];

  const filteredFAQs = selectedCategory === 'All'
    ? DEFAULT_FAQS
    : DEFAULT_FAQS.filter((f) => f.category === selectedCategory);

  const toggleItem = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className={`w-full ${className}`}>
      {showCategoryFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-8 pb-4 border-b border-stone-200">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:text-stone-900 hover:bg-stone-200'
              }`}
            >
              {cat === 'All' ? 'All Questions' : `${cat} Questions`}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {filteredFAQs.map((faq) => {
          const isOpen = openIds.includes(faq.id);
          return (
            <div
              key={faq.id}
              className={`rounded border transition-colors ${
                isOpen
                  ? 'border-orange-300 bg-white shadow-xs'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <button
                onClick={() => toggleItem(faq.id)}
                className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded shrink-0">
                    {faq.category}
                  </span>
                  <span className="text-base font-bold text-stone-900 leading-snug">
                    {faq.question}
                  </span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-stone-400 shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-orange-600' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-5 sm:px-5 sm:pb-6 text-sm text-stone-600 leading-relaxed border-t border-stone-100 pt-3">
                  <p className="whitespace-pre-line">{faq.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
