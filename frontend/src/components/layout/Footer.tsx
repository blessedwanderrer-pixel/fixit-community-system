import React from 'react';
import { Link } from 'react-router-dom';
import { FixItLogo } from '../brand/FixItLogo';
import { ShieldCheck, ArrowRight, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-stone-950 text-stone-300 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <FixItLogo size="md" variant="dark" />
            
            <p className="text-sm text-stone-400 leading-relaxed max-w-sm">
              FixIt is a citizen-driven community organization in Pakistan committed to visible, ground-level civic problem solving, social welfare, education, and institutional accountability.
            </p>

            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-stone-900 border border-stone-800 text-xs text-stone-300">
                <ShieldCheck className="w-4 h-4 text-orange-500" />
                <span>Authenticated Reporting & Donation Tracking Platform</span>
              </div>
            </div>
          </div>

          {/* Column 1: Citizen Platform */}
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-200 mb-4">
              Citizen Platform
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/report" className="text-stone-400 hover:text-white transition-colors">
                  Report a Problem
                </Link>
              </li>
              <li>
                <Link to="/track" className="text-stone-400 hover:text-white transition-colors">
                  Track Your Report
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-stone-400 hover:text-white transition-colors">
                  How FixIt Works
                </Link>
              </li>
              <li>
                <Link to="/transparency" className="text-stone-400 hover:text-white transition-colors">
                  Transparency Ledger
                </Link>
              </li>
              <li>
                <Link to="/upcoming-work" className="text-stone-400 hover:text-white transition-colors">
                  Upcoming Community Work
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Organization & Work */}
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-200 mb-4">
              Organization
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/about" className="text-stone-400 hover:text-white transition-colors">
                  About FixIt & Founders
                </Link>
              </li>
              <li>
                <Link to="/our-work" className="text-stone-400 hover:text-white transition-colors">
                  All Social Initiatives
                </Link>
              </li>
              <li>
                <Link to="/about#evolution" className="text-stone-400 hover:text-white transition-colors">
                  Evolution of FixIt
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-stone-400 hover:text-white transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-stone-400 hover:text-white transition-colors">
                  Contact & Inquiries
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Portals & Access */}
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-200 mb-4">
              Access Portals
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/login" className="text-stone-400 hover:text-white transition-colors">
                  Citizen Sign In
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-stone-400 hover:text-white transition-colors">
                  Field Coordinator Portal
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-stone-400 hover:text-white transition-colors">
                  Operations Admin Login
                </Link>
              </li>
              <li>
                <Link to="/faq?category=Privacy" className="text-stone-400 hover:text-white transition-colors">
                  Privacy Policy & Data Rights
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Separator */}
        <div className="mt-12 pt-8 border-t border-stone-800/80 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div>
            © {new Date().getFullYear()} FixIt Pakistan. Community Problem & Donation Tracking System.
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span>Built for citizen participation & radical civic transparency</span>
            <span>·</span>
            <span>Karachi & Pakistan</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
