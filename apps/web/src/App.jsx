import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
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
import { isPortalSubdomain } from '@atc/shared/utils/domains';

// Clean Public Layout for Main Domain Pages
function PublicLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 text-neutral-900 font-voodoo">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}

export function App() {
  useAuthListener();
  const isPortal = isPortalSubdomain();

  // If accessed on the portal subdomain (e.g. portal.advclub.online)
  // The member portal is mounted directly at root '/'
  if (isPortal) {
    return (
      <Routes>
        <Route
          path="/"
          element={
            <PortalLayout>
              <HomePage />
            </PortalLayout>
          }
        />
        <Route
          path="/events"
          element={
            <PortalLayout>
              <EventsPage />
            </PortalLayout>
          }
        />
        <Route
          path="/events/:id"
          element={
            <PortalLayout>
              <EventDetailPage />
            </PortalLayout>
          }
        />
        <Route
          path="/resources"
          element={
            <PortalLayout>
              <ResourcesPage />
            </PortalLayout>
          }
        />
        <Route
          path="/profile"
          element={
            <PortalLayout>
              <ProfilePage />
            </PortalLayout>
          }
        />
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

        {/* Public auth pages accessible on portal domain */}
        <Route
          path="/login"
          element={
            <PublicLayout>
              <AuthPage />
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

        {/* Backward-compatibility for /portal/* paths on portal domain */}
        <Route path="/portal" element={<Navigate to="/" replace />} />
        <Route path="/portal/events" element={<Navigate to="/events" replace />} />
        <Route path="/portal/events/:id" element={<Navigate to="/events/:id" replace />} />
        <Route path="/portal/resources" element={<Navigate to="/resources" replace />} />
        <Route path="/portal/profile" element={<Navigate to="/profile" replace />} />

        {/* Fallback to Portal Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

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
