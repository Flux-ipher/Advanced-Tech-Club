import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import { LeaderboardPage } from './pages/LeaderboardPage';
import { CheckinPage } from './pages/CheckinPage';
import { NotFound } from './pages/NotFound';
import { useAuthListener } from '@atc/shared/hooks/useAuth';
import { isPortalSubdomain } from '@atc/shared/utils/domains';

// Component to automatically redirect /portal routes to portal.advclub.online in production
function PortalRoute({ component: Component, cleanSubpath = '/' }) {
  const location = useLocation();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname.toLowerCase();
      // If accessed on advclub.online or www.advclub.online, redirect immediately to portal.advclub.online
      if (hostname.includes('advclub.online') && !isPortalSubdomain()) {
        const cleanPath = location.pathname.replace(/^\/portal/, '') || cleanSubpath || '/';
        const targetUrl = `https://portal.advclub.online${cleanPath}${location.search}`;
        window.location.replace(targetUrl);
      }
    }
  }, [location, cleanSubpath]);

  const isProd = typeof window !== 'undefined' && window.location.hostname.includes('advclub.online');
  if (isProd) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900 text-white font-voodoo">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-neutral-400">Navigating to Member Portal (portal.advclub.online)...</p>
        </div>
      </div>
    );
  }

  // In local development, permit rendering the portal locally
  return (
    <PortalLayout>
      <Component />
    </PortalLayout>
  );
}

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
        <Route
          path="/leaderboard"
          element={
            <PortalLayout>
              <LeaderboardPage />
            </PortalLayout>
          }
        />
        <Route
          path="/checkin"
          element={
            <PortalLayout>
              <CheckinPage />
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
        <Route path="/portal/leaderboard" element={<Navigate to="/leaderboard" replace />} />
        <Route path="/portal/checkin" element={<Navigate to="/checkin" replace />} />

        {/* 404 Fallback on Portal */}
        <Route
          path="*"
          element={
            <PortalLayout>
              <NotFound />
            </PortalLayout>
          }
        />
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
      <Route
        path="/leaderboard"
        element={
          <PublicLayout>
            <LeaderboardPage />
          </PublicLayout>
        }
      />
      <Route
        path="/checkin"
        element={
          <PublicLayout>
            <CheckinPage />
          </PublicLayout>
        }
      />

      {/* ========================================================= */}
      {/* 2. PROTECTED CLUB SUBDOMAIN PORTAL ROUTES (/portal/*)    */}
      {/* Automatically redirects to portal.advclub.online in prod */}
      {/* ========================================================= */}
      <Route
        path="/portal"
        element={<PortalRoute component={HomePage} cleanSubpath="/" />}
      />
      <Route
        path="/portal/events"
        element={<PortalRoute component={EventsPage} cleanSubpath="/events" />}
      />
      <Route
        path="/portal/events/:id"
        element={<PortalRoute component={EventDetailPage} cleanSubpath="/events" />}
      />
      <Route
        path="/portal/resources"
        element={<PortalRoute component={ResourcesPage} cleanSubpath="/resources" />}
      />
      <Route
        path="/portal/profile"
        element={<PortalRoute component={ProfilePage} cleanSubpath="/profile" />}
      />
      <Route
        path="/portal/leaderboard"
        element={<PortalRoute component={LeaderboardPage} cleanSubpath="/leaderboard" />}
      />
      <Route
        path="/portal/checkin"
        element={<PortalRoute component={CheckinPage} cleanSubpath="/checkin" />}
      />

      {/* Admin Management Routes */}
      <Route
        path="/admin"
        element={<PortalRoute component={AdminPage} cleanSubpath="/admin" />}
      />
      <Route
        path="/admin/members"
        element={<PortalRoute component={MembersAdminPage} cleanSubpath="/admin/members" />}
      />
      <Route
        path="/analytics"
        element={<PortalRoute component={AnalyticsPage} cleanSubpath="/analytics" />}
      />

      {/* 404 Fallback on Public Main Domain */}
      <Route
        path="*"
        element={
          <PublicLayout>
            <NotFound />
          </PublicLayout>
        }
      />
    </Routes>
  );
}

export default App;
