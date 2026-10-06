import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { PageHero } from '../components/common/PageHero';
import { useAuth } from '../auth/AuthContext';

export const RoleAreaPage: React.FC = () => {
  const { user } = useAuth();
  const roleLabel = user ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Authorized';

  return (
    <div className="w-full">
      <PageHero
        kicker="Authenticated System Access"
        title={`${roleLabel} Area`}
        subtitle="Your secure FixIt session is active. Role-specific dashboard features will be connected in a later implementation stage."
        breadcrumbs={[{ label: `${roleLabel} Area` }]}
        badgeText="Role Verified by Backend"
      />
      <section className="py-16 sm:py-24 bg-stone-50 border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded border border-stone-200 bg-white p-8 text-center shadow-xs">
            <div className="w-12 h-12 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-stone-900">Authenticated as {roleLabel}</h2>
            <p className="mt-2 text-sm text-stone-600">
              Access was authorized using the role returned by the FixIt API. No dashboard functionality has been added yet.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
