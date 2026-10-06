import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { type AppRole, roleHomePath } from './types';

const SessionLoading: React.FC = () => (
  <div className="min-h-[70vh] bg-stone-50 flex items-center justify-center px-4">
    <div className="text-center">
      <div className="w-8 h-8 rounded-full border-2 border-stone-300 border-t-orange-600 animate-spin mx-auto" />
      <p className="mt-3 text-xs font-mono text-stone-500">VERIFYING SECURE SESSION</p>
    </div>
  </div>
);

export const ProtectedRoute: React.FC = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <SessionLoading />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />;
  }
  return <Outlet />;
};

export const RoleGuard: React.FC<{ allowedRole: AppRole }> = ({ allowedRole }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <SessionLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== allowedRole) return <Navigate to={roleHomePath[user.role]} replace />;
  return <Outlet />;
};
