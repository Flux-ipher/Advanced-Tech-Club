import React, { useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@atc/shared/hooks/useAuth';
import { useMembers } from '@atc/shared/hooks/useMembers';
import { RoleBadge } from './RoleBadge';
import { isPortalSubdomain, getPublicSiteUrl } from '@atc/shared/utils/domains';
import {
  House,
  CalendarBlank,
  Folder,
  User,
  ShieldStar,
  ChartBar,
  CaretLeft,
  CaretRight,
  Globe,
  Clock,
  SignOut,
  Trophy
} from '@phosphor-icons/react';

export function PortalSidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const { user, isAdmin, signOut, logout } = useAuth();
  const { pendingMembers } = useMembers();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    if (signOut) {
      await signOut();
    } else if (logout) {
      logout();
    }
    onCloseMobile?.();
    navigate('/');
  };

  const pendingCount = pendingMembers?.length || 0;
  const isPortal = isPortalSubdomain();
  const portalPrefix = isPortal ? '' : '/portal';

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${
      isActive
        ? 'bg-primary-500 text-white shadow-sm'
        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
    } ${collapsed ? 'justify-center px-2' : ''}`;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-neutral-950/40 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-white border-r border-neutral-200 transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-neutral-200 flex items-center justify-between shrink-0">
          <Link
            to={portalPrefix || '/'}
            className={`flex items-center gap-3 overflow-hidden ${
              collapsed ? 'justify-center w-full' : ''
            }`}
          >
            <img
              src="/logo.png"
              alt="ATC Logo"
              className="w-9 h-9 rounded-xl object-contain shadow-sm border border-neutral-200/80 bg-white shrink-0"
            />
            {!collapsed && (
              <div className="overflow-hidden">
                <span className="font-extrabold text-sm text-neutral-900 tracking-tight block leading-none truncate">
                  Advanced Tech Club
                </span>
                <span className="text-[10px] font-semibold text-neutral-400 block mt-1 leading-none uppercase tracking-wider">
                  Club Portal Hub
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          {!collapsed && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              title="Collapse sidebar"
            >
              <CaretLeft size={16} weight="bold" />
            </button>
          )}
        </div>

        {/* Collapsed expand toggle button */}
        {collapsed && (
          <div className="hidden lg:flex justify-center py-2 border-b border-neutral-100">
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              title="Expand sidebar"
            >
              <CaretRight size={16} weight="bold" />
            </button>
          </div>
        )}

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* GROUP 1: COMMUNITY & FEED */}
          <div>
            {!collapsed && (
              <p className="px-3 text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Community
              </p>
            )}
            <div className="space-y-1">
              <NavLink
                to={portalPrefix || '/'}
                end
                onClick={onCloseMobile}
                className={navItemClass}
                title="Announcements"
              >
                {({ isActive }) => (
                  <>
                    <House size={18} weight={isActive ? 'fill' : 'regular'} className="shrink-0" />
                    {!collapsed && <span>Announcements</span>}
                  </>
                )}
              </NavLink>

              <NavLink
                to={`${portalPrefix}/events`}
                onClick={onCloseMobile}
                className={navItemClass}
                title="Workshops & Events"
              >
                {({ isActive }) => (
                  <>
                    <CalendarBlank size={18} weight={isActive ? 'fill' : 'regular'} className="shrink-0" />
                    {!collapsed && <span>Workshops & Sprints</span>}
                  </>
                )}
              </NavLink>

              <NavLink
                to={`${portalPrefix}/leaderboard`}
                onClick={onCloseMobile}
                className={navItemClass}
                title="Leaderboard & Badges"
              >
                {({ isActive }) => (
                  <>
                    <Trophy size={18} weight={isActive ? 'fill' : 'regular'} className="shrink-0 text-amber-500" />
                    {!collapsed && <span>Leaderboard & Badges</span>}
                  </>
                )}
              </NavLink>
            </div>
          </div>

          {/* GROUP 2: KNOWLEDGE VAULT */}
          <div>
            {!collapsed && (
              <p className="px-3 text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Resources
              </p>
            )}
            <div className="space-y-1">
              <NavLink
                to={`${portalPrefix}/resources`}
                onClick={onCloseMobile}
                className={navItemClass}
                title="Vault Resources"
              >
                {({ isActive }) => (
                  <>
                    <Folder size={18} weight={isActive ? 'fill' : 'regular'} className="shrink-0" />
                    {!collapsed && <span>Vault Library</span>}
                  </>
                )}
              </NavLink>

              <NavLink
                to={`${portalPrefix}/profile`}
                onClick={onCloseMobile}
                className={navItemClass}
                title="My Profile"
              >
                {({ isActive }) => (
                  <>
                    <User size={18} weight={isActive ? 'fill' : 'regular'} className="shrink-0" />
                    {!collapsed && <span>My Profile</span>}
                  </>
                )}
              </NavLink>
            </div>
          </div>

          {/* GROUP 3: ADMINISTRATION (Role-Gated) */}
          {isAdmin && (
            <div>
              {!collapsed && (
                <p className="px-3 text-[10px] font-bold text-warning-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Administration</span>
                  <span className="text-[9px] bg-warning-100 text-warning-800 px-1.5 py-0.2 rounded font-mono font-bold">
                    Admin
                  </span>
                </p>
              )}
              <div className="space-y-1">
                <NavLink
                  to="/admin"
                  end
                  onClick={onCloseMobile}
                  className={navItemClass}
                  title="Admin Studio"
                >
                  {({ isActive }) => (
                    <>
                      <ShieldStar size={18} weight={isActive ? 'fill' : 'regular'} className="text-warning-600 shrink-0" />
                      {!collapsed && <span>Admin Studio</span>}
                    </>
                  )}
                </NavLink>

                <NavLink
                  to="/admin/members"
                  onClick={onCloseMobile}
                  className={navItemClass}
                  title="Student Verifications"
                >
                  {({ isActive }) => (
                    <>
                      <Clock size={18} weight={isActive ? 'fill' : 'regular'} className="text-primary-500 shrink-0" />
                      {!collapsed && (
                        <span className="flex-1 flex items-center justify-between">
                          <span>Verifications</span>
                          {pendingCount > 0 && (
                            <span className="px-1.5 py-0.2 text-[10px] font-bold bg-warning-500 text-white rounded-full">
                              {pendingCount}
                            </span>
                          )}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>

                <NavLink
                  to="/analytics"
                  onClick={onCloseMobile}
                  className={navItemClass}
                  title="Growth Analytics"
                >
                  {({ isActive }) => (
                    <>
                      <ChartBar size={18} weight={isActive ? 'fill' : 'regular'} className="text-primary-500 shrink-0" />
                      {!collapsed && <span>Analytics</span>}
                    </>
                  )}
                </NavLink>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-neutral-200 bg-neutral-50/50 space-y-2 shrink-0">
          {/* Back to Public Site Link */}
          {isPortal ? (
            <a
              href={getPublicSiteUrl('/')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors ${
                collapsed ? 'justify-center px-1' : ''
              }`}
              title="Return to Public Website (advclub.online)"
            >
              <Globe size={18} weight="regular" className="text-neutral-500 shrink-0" />
              {!collapsed && <span>Exit to Public Site</span>}
            </a>
          ) : (
            <Link
              to="/"
              onClick={onCloseMobile}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors ${
                collapsed ? 'justify-center px-1' : ''
              }`}
              title="Return to Public Website"
            >
              <Globe size={18} weight="regular" className="text-neutral-500 shrink-0" />
              {!collapsed && <span>Exit to Public Site</span>}
            </Link>
          )}

          {/* User Mini Card with Log Out */}
          <div
            className={`flex items-center justify-between p-2 rounded-xl bg-white border border-neutral-200 ${
              collapsed ? 'justify-center p-1.5' : ''
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                alt={user?.full_name}
                className="w-8 h-8 rounded-full object-cover border border-neutral-200 shrink-0"
              />
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-neutral-900 truncate">{user?.full_name}</p>
                  <p className="text-[10px] font-semibold text-primary-600 uppercase tracking-wider">
                    {user?.role === 'super_admin' || user?.role === 'admin' ? 'Admin' : 'Member'}
                  </p>
                </div>
              )}
            </div>
            {!collapsed && (
              <button
                type="button"
                onClick={handleSignOut}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                title="Log Out / Sign Out"
              >
                <SignOut size={18} weight="regular" />
              </button>
            )}
          </div>

          {collapsed && (
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center justify-center p-2 rounded-xl text-neutral-500 hover:text-danger-600 hover:bg-danger-50 transition-colors"
              title="Log Out / Sign Out"
            >
              <SignOut size={18} weight="regular" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

export default PortalSidebar;
