import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@atc/shared/hooks/useAuth';
import { NotificationDropdown } from './NotificationDropdown';
import { DemoRoleSwitcher } from './DemoRoleSwitcher';
import {
  Menu,
  PanelLeft,
  Globe,
  ExternalLink,
  ChevronRight,
  Smartphone,
  Download,
  Radio,
  LogOut
} from 'lucide-react';

export function PortalHeader({ collapsed, onToggleCollapse, onOpenMobile }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/portal') return 'Announcements Feed';
    if (path.startsWith('/portal/events/')) return 'Event Logistics & Attendees';
    if (path.startsWith('/portal/events')) return 'Workshops & Hackathons';
    if (path.startsWith('/portal/resources')) return 'Knowledge Vault Library';
    if (path.startsWith('/portal/profile')) return 'My Profile & Registrations';
    if (path.startsWith('/admin/members')) return 'Student Verifications & Roles';
    if (path.startsWith('/admin')) return 'Operations Studio';
    if (path.startsWith('/analytics')) return 'Growth & Attendance Analytics';
    return 'Club Portal';
  };

  const getCategoryName = () => {
    const path = location.pathname;
    if (path.startsWith('/admin') || path.startsWith('/analytics')) return 'Admin Console';
    return 'Club Portal';
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile Trigger & Breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger */}
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex p-2 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <PanelLeft className="w-5 h-5" />
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-semibold text-neutral-400 hidden sm:inline">
            {getCategoryName()}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-300 hidden sm:inline" />
          <h2 className="font-bold text-neutral-900 text-sm tracking-tight">
            {getPageTitle()}
          </h2>
        </div>

        {/* Subdomain Indicator Badge */}
        <span className="hidden xl:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-primary-50 text-primary-700 border border-primary-200">
          app.techclub.edu
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Realtime Live Pulse */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-50 border border-success-200 text-success-700 text-[11px] font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success-500"></span>
          </span>
          <span>Live WebSocket</span>
        </div>

        {/* Standalone Android APK Download */}
        <a
          href="/atc-release.apk"
          download="atc-mobile-release.apk"
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-sm transition-all group"
          title="Download Standalone Android APK (v1.2.0 • 64MB)"
        >
          <Smartphone className="w-3.5 h-3.5 text-primary-400 group-hover:scale-110 transition-transform" />
          <span>Android APK</span>
          <span className="text-[9px] bg-primary-500/30 text-primary-300 font-bold px-1.5 py-0.2 rounded font-mono">
            64MB
          </span>
        </a>

        {/* Persona Switcher */}
        <DemoRoleSwitcher />

        {/* Notification Bell */}
        <NotificationDropdown />

        {/* Exit back to main domain link */}
        <Link
          to="/"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors"
        >
          <Globe className="w-3.5 h-3.5 text-neutral-400" />
          Public Site
        </Link>

        {/* Log Out Button */}
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-700 hover:text-danger-600 hover:border-danger-200 hover:bg-danger-50 transition-colors"
          title="Sign Out / Log Out"
        >
          <LogOut className="w-3.5 h-3.5 text-neutral-400 hover:text-danger-500" />
          <span className="hidden sm:inline">Log Out</span>
        </button>
      </div>
    </header>
  );
}

export default PortalHeader;
