import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { FixItLogo } from '../brand/FixItLogo';
import { Menu, X, AlertCircle, ChevronDown, User, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { roleHomePath } from '../../auth/types';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      setMobileMenuOpen(false);
    } catch {
      // Keep the current session visible if Supabase could not revoke it.
    }
  };

  const mainLinks = [
    { label: 'Home', path: '/' },
    { label: 'About', path: '/about' },
    { label: 'How It Works', path: '/how-it-works' },
    { label: 'Our Work', path: '/our-work' },
    { label: 'Transparency', path: '/transparency' },
    { label: 'Upcoming Work', path: '/upcoming-work' },
  ];

  const secondaryLinks = [
    { label: 'FAQ', path: '/faq' },
    { label: 'Contact', path: '/contact' },
    { label: 'Track Your Report', path: '/track' },
    { label: 'Submit Donation Proof', path: '/submit-donation-proof' },
  ];

  const allNavLinks = [...mainLinks, ...secondaryLinks];

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-semibold transition-colors py-1 whitespace-nowrap ${
      isActive
        ? 'text-orange-600 border-b-2 border-orange-600'
        : 'text-stone-700 hover:text-stone-950'
    }`;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-200">
      {/* Top Banner Notice: New Civic Platform */}
      <div className="bg-stone-900 text-stone-300 text-xs py-1.5 px-4 text-center border-b border-stone-800">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          <span className="font-medium text-stone-200">
            FixIt Community Problem & Donation Tracking System
          </span>
          <span className="hidden sm:inline text-stone-500">|</span>
          <span className="hidden sm:inline text-stone-400">
            Authenticated reporting & aggregate public transparency
          </span>
        </div>
      </div>

      {/* Primary Top Bar adhering to the 3-Zone Contract */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* ZONE 1: Brand Wordmark */}
          <div className="shrink-0 flex items-center">
            <FixItLogo size="md" variant="light" />
          </div>

          {/* ZONE 2: Navigation Links (Clean text links with hover effect) */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
            {mainLinks.map((link) => (
              <NavLink key={link.path} to={link.path} className={navLinkClasses}>
                {link.label}
              </NavLink>
            ))}

            {/* "More" dropdown for secondary items to maintain top-bar breathability */}
            <div className="relative">
              <button
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                onBlur={() => setTimeout(() => setMoreMenuOpen(false), 200)}
                className="flex items-center gap-1 text-sm font-semibold text-stone-700 hover:text-stone-950 py-1"
                aria-expanded={moreMenuOpen}
              >
                <span>More</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {moreMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded border border-stone-200 bg-white shadow-lg py-1.5 z-50">
                  {secondaryLinks.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="block px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 hover:text-orange-600 font-medium whitespace-nowrap transition-colors"
                      onClick={() => setMoreMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* ZONE 3: Primary Actions (Login + Report CTA) */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to={roleHomePath[user.role]}
                  className="px-3.5 py-2 text-xs font-bold text-stone-700 hover:text-stone-900 rounded border border-stone-200 hover:border-stone-300 transition-colors whitespace-nowrap inline-flex items-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5 text-stone-500" />
                  <span>My Area</span>
                </Link>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="px-3.5 py-2 text-xs font-bold text-stone-500 hover:text-stone-900 whitespace-nowrap"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="px-3.5 py-2 text-xs font-bold text-stone-700 hover:text-stone-900 rounded border border-stone-200 hover:border-stone-300 transition-colors whitespace-nowrap inline-flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-stone-500" />
                <span>Login</span>
              </Link>
            )}

            <Link
              to="/report"
              className="px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded transition-colors whitespace-nowrap inline-flex items-center gap-1.5 shadow-xs"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Report a Problem</span>
            </Link>
          </div>

          {/* Mobile Menu Hamburger */}
          <div className="flex sm:hidden items-center gap-2">
            <Link
              to="/report"
              className="px-3 py-1.5 text-xs font-bold text-white bg-orange-600 rounded whitespace-nowrap"
            >
              Report
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded text-stone-700 hover:text-stone-900 hover:bg-stone-100"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-stone-200 bg-white px-4 pt-3 pb-6 space-y-1">
          {allNavLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2.5 rounded text-sm font-semibold transition-colors ${
                location.pathname === link.path
                  ? 'bg-orange-50 text-orange-600'
                  : 'text-stone-700 hover:bg-stone-50'
              }`}
            >
              {link.label}
            </Link>
          ))}

          <div className="pt-4 mt-2 border-t border-stone-100 space-y-2">
            <Link
              to="/report"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white bg-orange-600 rounded"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Report a Problem</span>
            </Link>

            {user ? (
              <>
                <Link
                  to={roleHomePath[user.role]}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-stone-800 bg-stone-100 rounded"
                >
                  <User className="w-4 h-4 text-stone-500" />
                  <span>Open My Area</span>
                </Link>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="w-full flex items-center justify-center px-4 py-3 text-sm font-bold text-stone-600"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-stone-800 bg-stone-100 rounded"
              >
                <User className="w-4 h-4 text-stone-500" />
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
