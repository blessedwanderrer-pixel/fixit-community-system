import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleHelp, Eye, LogIn, Menu, UserPlus, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { roleHomePath } from '../../auth/types';
import { FixItLogo } from '../brand/FixItLogo';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useI18n } from '../../i18n/I18nContext';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  const closeMenu = () => setMobileMenuOpen(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      closeMenu();
    } catch {
      // Preserve the visible session when revocation fails.
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200 bg-[#fffdf8]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="FixIt home" onClick={closeMenu} className="shrink-0">
          <FixItLogo size="md" variant="light" />
        </Link>

        <div className="hidden items-center gap-3 sm:flex">
          <LanguageSwitcher />
          <span className="h-7 w-px bg-stone-200" aria-hidden="true" />
          <Link to="/transparency" className="inline-flex items-center gap-1.5 px-2 py-3 text-sm font-bold text-stone-600 hover:text-orange-600"><Eye className="h-4 w-4" />{t('Transparency')}</Link>
          <Link to="/faq" className="inline-flex items-center gap-1.5 px-2 py-3 text-sm font-bold text-stone-600 hover:text-orange-600"><CircleHelp className="h-4 w-4" />{t('Help')}</Link>
          {user ? (
            <>
              <Link to={roleHomePath[user.role]} className="fixit-button-secondary">My Area</Link>
              <button type="button" onClick={() => void handleSignOut()} className="px-3 py-3 text-sm font-bold text-stone-600 hover:text-stone-950">Sign Out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="fixit-button-secondary"><LogIn className="h-4 w-4" />Sign In</Link>
              <Link to="/signup" className="fixit-button-primary"><UserPlus className="h-4 w-4" />Create Account</Link>
            </>
          )}
        </div>

        <button type="button" onClick={() => setMobileMenuOpen((open) => !open)} className="grid h-11 w-11 place-items-center rounded-lg border border-stone-200 text-stone-800 sm:hidden" aria-label="Toggle navigation menu" aria-expanded={mobileMenuOpen}>
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileMenuOpen ? (
        <div className="border-t border-stone-200 bg-[#fffdf8] px-4 py-5 sm:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-3">
            <LanguageSwitcher mobile />
            {user ? (
              <>
                <Link to={roleHomePath[user.role]} onClick={closeMenu} className="fixit-button-primary justify-center">Open My Area</Link>
                <button type="button" onClick={() => void handleSignOut()} className="fixit-button-secondary justify-center">Sign Out</button>
              </>
            ) : (
              <>
                <Link to="/signup" onClick={closeMenu} className="fixit-button-primary justify-center"><UserPlus className="h-4 w-4" />Create Account</Link>
                <Link to="/login" onClick={closeMenu} className="fixit-button-secondary justify-center"><LogIn className="h-4 w-4" />Sign In</Link>
              </>
            )}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-stone-200 pt-4">
              <Link to="/transparency" onClick={closeMenu} className="fixit-button-secondary justify-center"><Eye className="h-4 w-4" />{t('Transparency')}</Link>
              <Link to="/faq" onClick={closeMenu} className="fixit-button-secondary justify-center"><CircleHelp className="h-4 w-4" />{t('Help')}</Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
};
