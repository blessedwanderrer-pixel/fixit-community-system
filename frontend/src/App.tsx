import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { OurWorkPage } from './pages/OurWorkPage';
import { TransparencyPage } from './pages/TransparencyPage';
import { UpcomingWorkPage } from './pages/UpcomingWorkPage';
import { FAQPage } from './pages/FAQPage';
import { ContactPage } from './pages/ContactPage';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { SignupPage } from './pages/SignupPage';
import { ReportProblemPage } from './pages/ReportProblemPage';
import { TrackReportPage } from './pages/TrackReportPage';
import { SubmitDonationProofPage } from './pages/SubmitDonationProofPage';
import { CitizenDashboardPage } from './pages/CitizenDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { CoordinatorDashboardPage } from './pages/CoordinatorDashboardPage';
import { ProtectedRoute, RoleGuard } from './auth/RouteGuards';
import { ApiLoadingIndicator } from './components/common/ApiLoadingIndicator';

export default function App() {
  return (
    <BrowserRouter>
      <ApiLoadingIndicator />
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/our-work" element={<OurWorkPage />} />
          <Route path="/transparency" element={<TransparencyPage />} />
          <Route path="/upcoming-work" element={<UpcomingWorkPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<RoleGuard allowedRole="citizen" />}>
              <Route path="/citizen" element={<CitizenDashboardPage />} />
              <Route path="/report" element={<ReportProblemPage />} />
              <Route path="/track" element={<TrackReportPage />} />
              <Route path="/submit-donation-proof" element={<SubmitDonationProofPage />} />
            </Route>
            <Route element={<RoleGuard allowedRole="admin" />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
            </Route>
            <Route element={<RoleGuard allowedRole="coordinator" />}>
              <Route path="/coordinator" element={<CoordinatorDashboardPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
