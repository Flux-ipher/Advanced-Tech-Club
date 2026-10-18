import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@atc/shared/hooks/useAuth';
import { NotificationDropdown } from './NotificationDropdown';
import { DemoRoleSwitcher } from './DemoRoleSwitcher';
import {
  Menu,
  PanelLeft,
  Globe,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export function PortalHeader({ collapsed, onToggleCollapse, onOpenMobile }) {
  const { user } = useAuth();
  const location = useLocation();

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
      </div>
    </header>
  );
}

export default PortalHeader;
