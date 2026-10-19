import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PublicNavbar } from './components/PublicNavbar';
import { PortalLayout } from './components/PortalLayout';
import { Footer } from './components/Footer';

// Public Pages (Main Domain)
import { LandingPage } from './pages/LandingPage';
import { ApplyPage } from './pages/ApplyPage';
import { VerificationStatusPage } from './pages/VerificationStatusPage';
import { AuthPage } from './pages/AuthPage';

// Internal Club Portal Pages (Subdomain / Protected)
import { HomePage } from './pages/HomePage'; // Announcements & Feed
import { EventsPage } from './pages/EventsPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';
import { MembersAdminPage } from './pages/MembersAdminPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { useAuthListener } from '@atc/shared/hooks/useAuth';

// Clean Public Layout for Main Domain Pages
function PublicLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 text-neutral-900 font-voodoo">
      <PublicNavbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}

export function App() {
  useAuthListener();

  return (
    <Routes>
      {/* ========================================================= */}
      {/* 1. PUBLIC MAIN DOMAIN ROUTES (Accessible to Everyone)     */}
      {/* ========================================================= */}
      <Route
        path="/"
        element={
          <PublicLayout>
            <LandingPage />
          </PublicLayout>
        }
      />
      <Route
        path="/apply"
        element={
          <PublicLayout>
            <ApplyPage />
          </PublicLayout>
        }
      />
      <Route
        path="/verification-status"
        element={
          <PublicLayout>
            <VerificationStatusPage />
          </PublicLayout>
        }
      />
      <Route
        path="/events"
        element={
          <PublicLayout>
            <EventsPage />
          </PublicLayout>
        }
      />
      <Route
        path="/events/:id"
        element={
          <PublicLayout>
            <EventDetailPage />
          </PublicLayout>
        }
      />
      <Route
        path="/login"
        element={
          <PublicLayout>
            <AuthPage />
          </PublicLayout>
        }
      />

      {/* ========================================================= */}
      {/* 2. PROTECTED CLUB SUBDOMAIN PORTAL ROUTES (/portal/*)    */}
      {/* Wrapped in Collapsible Sidebar Portal Layout & Gate       */}
      {/* ========================================================= */}
      <Route
        path="/portal"
        element={
          <PortalLayout>
            <HomePage />
          </PortalLayout>
        }
      />
      <Route
        path="/portal/events"
        element={
          <PortalLayout>
            <EventsPage />
          </PortalLayout>
        }
      />
      <Route
        path="/portal/events/:id"
        element={
          <PortalLayout>
            <EventDetailPage />
          </PortalLayout>
        }
      />
      <Route
        path="/portal/resources"
        element={
          <PortalLayout>
            <ResourcesPage />
          </PortalLayout>
        }
      />
      <Route
        path="/portal/profile"
        element={
          <PortalLayout>
            <ProfilePage />
          </PortalLayout>
        }
      />

      {/* Admin Management Routes */}
      <Route
        path="/admin"
        element={
          <PortalLayout>
            <AdminPage />
          </PortalLayout>
        }
      />
      <Route
        path="/admin/members"
        element={
          <PortalLayout>
            <MembersAdminPage />
          </PortalLayout>
        }
      />
      <Route
        path="/analytics"
        element={
          <PortalLayout>
            <AnalyticsPage />
          </PortalLayout>
        }
      />

      {/* Fallback to Public Landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
