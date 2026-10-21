import React, { useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@atc/shared/hooks/useAuth';
import { NotificationDropdown } from './NotificationDropdown';
import { RoleBadge } from './RoleBadge';
import { isPortalSubdomain, getPortalSiteUrl, getPublicSiteUrl } from '@atc/shared/utils/domains';
import {
  ShieldStar,
  ChartBar,
  List,
  X,
  ArrowRight,
  SignOut,
  SignIn,
  UserPlus
} from '@phosphor-icons/react';

export function Navbar() {
  const { user, isAdmin, isSuperAdmin, isVerified, signOut, signInWithGoogle } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const portalUrl = getPortalSiteUrl('/');
  const loginUrl = getPortalSiteUrl('/login');
  const registerUrl = getPortalSiteUrl('/login?mode=register');
  const isExternalPortal = portalUrl.startsWith('http');

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleGoogleSignIn = async () => {
    try {
      const res = await signInWithGoogle();
      if (res?.isNewUser || !res?.profile?.student_id) {
        if (isExternalPortal) {
          window.location.replace(getPublicSiteUrl('/apply'));
        } else {
          navigate('/apply');
        }
      } else {
        if (isExternalPortal) {
          window.location.replace(portalUrl);
        } else {
          navigate('/portal');
        }
      }
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        console.warn('Google sign-in error:', err);
      }
    }
  };

  // Determine if user is currently inside the Subdomain Club Portal vs the Public Website
  const isPortalSection =
    location.pathname.startsWith('/portal') ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/analytics');

  const navLinkClass = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
      isActive
        ? 'text-primary-600 bg-primary-50 font-bold'
        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
    }`;

  const mobileLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'text-primary-600 bg-primary-50 font-bold'
        : 'text-neutral-700 hover:bg-neutral-100'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand Name */}
          <div className="flex items-center gap-6 lg:gap-8 shrink-0">
            <Link to="/" className="flex items-center gap-3 group shrink-0">
              <div className="w-9 h-9 rounded-xl bg-primary-500 text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:bg-primary-600 transition-colors shrink-0">
                ATC
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-sm sm:text-base font-extrabold text-neutral-900 tracking-tight leading-none group-hover:text-primary-600 transition-colors whitespace-nowrap">
                  Advanced Tech Club
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-neutral-400 tracking-wide mt-1 leading-none hidden sm:block">
                  {isPortalSection ? 'Club Portal' : 'Official Campus Platform'}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {!isPortalSection ? (
                /* PUBLIC WEBSITE LINKS (Main Domain) */
                <>
                  <NavLink to="/" end className={navLinkClass}>
                    Home
                  </NavLink>
                  <NavLink to="/events" className={navLinkClass}>
                    Public Events
                  </NavLink>
                  <NavLink to="/apply" className={navLinkClass}>
                    Apply to Join
                  </NavLink>
                  <NavLink to="/verification-status" className={navLinkClass}>
                    Check Status
                  </NavLink>
                </>
              ) : (
                /* INTERNAL CLUB PORTAL LINKS (Subdomain: app.techclub.edu) */
                <>
                  <NavLink to="/portal" end className={navLinkClass}>
                    Announcements
                  </NavLink>
                  <NavLink to="/portal/events" className={navLinkClass}>
                    Workshops
                  </NavLink>
                  <NavLink to="/portal/resources" className={navLinkClass}>
                    Vault Resources
                  </NavLink>
                  <NavLink to="/portal/profile" className={navLinkClass}>
                    Profile
                  </NavLink>

                  {isAdmin && (
                    <NavLink to="/admin" end className={navLinkClass}>
                      <span className="flex items-center gap-1.5 text-warning-700">
                        <ShieldStar size={14} weight="fill" />
                        Admin
                      </span>
                    </NavLink>
                  )}
                  {isSuperAdmin && (
                    <NavLink to="/admin/members" className={navLinkClass}>
                      <span className="flex items-center gap-1.5 text-primary-600">
                        <ShieldStar size={14} weight="fill" />
                        Verifications
                      </span>
                    </NavLink>
                  )}
                  {isAdmin && (
                    <NavLink to="/analytics" className={navLinkClass}>
                      Analytics
                    </NavLink>
                  )}
                </>
              )}
            </nav>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Authenticated User Controls */}
            {user ? (
              <div className="flex items-center gap-2">
                {!isPortalSection ? (
                  isPortalSubdomain() ? (
                    <Link
                      to="/"
                      className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-bold hover:bg-primary-600 transition-colors shadow-sm"
                    >
                      Club Portal <ArrowRight size={14} weight="bold" />
                    </Link>
                  ) : (
                    <a
                      href={getPortalSiteUrl('/')}
                      className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-bold hover:bg-primary-600 transition-colors shadow-sm"
                    >
                      Club Portal <ArrowRight size={14} weight="bold" />
                    </a>
                  )
                ) : (
                  <a
                    href={getPublicSiteUrl('/')}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs font-semibold hover:bg-neutral-200 transition-colors"
                  >
                    ← Public Site
                  </a>
                )}

                <Link
                  to="/portal/profile"
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-neutral-100 transition-colors"
                  title={`${user?.full_name} (${user?.is_verified ? 'Verified' : 'Pending Review'})`}
                >
                  <div className="relative">
                    <img
                      src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                      alt={user?.full_name}
                      className="w-8 h-8 rounded-full object-cover border border-neutral-300 ring-2 ring-primary-50"
                    />
                    {user?.is_verified ? (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success-500 ring-2 ring-white" />
                    ) : (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-warning-500 ring-2 ring-white" />
                    )}
                  </div>
                  <div className="hidden xl:block text-left">
                    <span className="text-xs font-semibold text-neutral-900 block leading-tight">
                      {user?.full_name?.split(' ')[0]}
                    </span>
                    <span className={`text-[10px] font-bold uppercase ${
                      user?.is_verified ? 'text-primary-600' : 'text-warning-700'
                    }`}>
                      {user?.role === 'super_admin' || user?.role === 'admin' ? 'Admin' : 'Member'}
                    </span>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:text-danger-600 hover:border-danger-200 hover:bg-danger-50 text-xs font-semibold transition-colors"
                  title="Sign Out / Log Out"
                >
                  <SignOut size={14} weight="regular" />
                  <span className="hidden xl:inline">Log Out</span>
                </button>
              </div>
            ) : (
              /* Logged Out: ONLY Log In and Sign Up buttons */
              <div className="flex items-center gap-1.5 sm:gap-2">
                {isExternalPortal ? (
                  <a
                    href={loginUrl}
                    className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-colors whitespace-nowrap"
                  >
                    <SignIn size={14} weight="regular" className="text-neutral-500 hidden sm:inline" />
                    <span>Log In</span>
                  </a>
                ) : (
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-colors whitespace-nowrap"
                  >
                    <SignIn size={14} weight="regular" className="text-neutral-500 hidden sm:inline" />
                    <span>Log In</span>
                  </Link>
                )}
                {isExternalPortal ? (
                  <a
                    href={registerUrl}
                    className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold shadow-xs transition-colors whitespace-nowrap"
                  >
                    <UserPlus size={14} weight="fill" className="hidden sm:inline" />
                    <span>Sign Up</span>
                  </a>
                ) : (
                  <Link
                    to="/login?mode=register"
                    className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold shadow-xs transition-colors whitespace-nowrap"
                  >
                    <UserPlus size={14} weight="fill" className="hidden sm:inline" />
                    <span>Sign Up</span>
                  </Link>
                )}
              </div>
            )}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} weight="bold" /> : <List size={24} weight="bold" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <div className="pt-2 border-t border-neutral-100">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
              {isPortalSection ? 'Portal Navigation' : 'Navigation'}
            </p>
            <div className="space-y-1">
              {!isPortalSection ? (
                <>
                  <NavLink to="/" end onClick={() => setMobileMenuOpen(false)} className={mobileLinkClass}>
                    Home
                  </NavLink>
                  <NavLink to="/events" onClick={() => setMobileMenuOpen(false)} className={mobileLinkClass}>
                    Public Events
                  </NavLink>
                  <NavLink to="/apply" onClick={() => setMobileMenuOpen(false)} className={mobileLinkClass}>
                    Apply to Join
                  </NavLink>
                  <NavLink to="/verification-status" onClick={() => setMobileMenuOpen(false)} className={mobileLinkClass}>
                    Check Verification Status
                  </NavLink>
                  {user && (
                    <div className="pt-2">
                      <Link
                        to="/portal"
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full btn-primary text-xs py-2.5 flex items-center justify-center gap-2 font-bold"
                      >
                        Launch Club Portal →
                      </Link>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <NavLink to="/portal" end onClick={() => setMobileMenuOpen(false)} className={mobileLinkClass}>
                    Announcements
                  </NavLink>
                  <NavLink to="/portal/events" onClick={() => setMobileMenuOpen(false)} className={mobileLinkClass}>
                    Workshops
                  </NavLink>
                  <NavLink to="/portal/resources" onClick={() => setMobileMenuOpen(false)} className={mobileLinkClass}>
                    Vault Resources
                  </NavLink>
                  <NavLink to="/portal/profile" onClick={() => setMobileMenuOpen(false)} className={mobileLinkClass}>
                    My Profile
                  </NavLink>

                  {isAdmin && (
                    <NavLink to="/admin" end onClick={() => setMobileMenuOpen(false)} className={mobileLinkClass}>
                      <ShieldStar size={16} weight="fill" className="text-warning-600" /> Admin Studio
                    </NavLink>
                  )}
                  {isSuperAdmin && (
                    <NavLink to="/admin/members" onClick={() => setMobileMenuOpen(false)} className={mobileLinkClass}>
                      <ShieldStar size={16} weight="fill" className="text-primary-600" /> Member Verifications
                    </NavLink>
                  )}
                  {isAdmin && (
                    <NavLink to="/analytics" onClick={() => setMobileMenuOpen(false)} className={mobileLinkClass}>
                      <ChartBar size={16} weight="fill" className="text-primary-500" /> Analytics
                    </NavLink>
                  )}

                  <div className="pt-2">
                    <a
                      href={getPublicSiteUrl('/')}
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full btn-secondary text-xs py-2 flex items-center justify-center gap-1.5"
                    >
                      ← Back to Public Website
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Auth Actions in Mobile Drawer */}
          <div className="pt-3 border-t border-neutral-200">
            {user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                    alt={user?.full_name}
                    className="w-7 h-7 rounded-full object-cover border border-neutral-300"
                  />
                  <div>
                    <span className="text-xs font-bold text-neutral-900 block leading-tight">{user?.full_name}</span>
                    <span className="text-[10px] text-neutral-500">{user?.email || 'Signed in'}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger-50 text-danger-700 border border-danger-200 text-xs font-bold hover:bg-danger-100 transition-colors"
                >
                  <SignOut size={14} weight="regular" />
                  Log Out
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                {isExternalPortal ? (
                  <a
                    href={loginUrl}
                    className="flex-1 py-2 text-center rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                  >
                    Log In
                  </a>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 py-2 text-center rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                  >
                    Log In
                  </Link>
                )}
                {isExternalPortal ? (
                  <a
                    href={registerUrl}
                    className="flex-1 py-2 text-center rounded-lg bg-primary-500 hover:bg-primary-600 text-xs font-bold text-white shadow-xs"
                  >
                    Sign Up
                  </a>
                ) : (
                  <Link
                    to="/login?mode=register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 py-2 text-center rounded-lg bg-primary-500 hover:bg-primary-600 text-xs font-bold text-white shadow-xs"
                  >
                    Sign Up
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
