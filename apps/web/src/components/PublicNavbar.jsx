import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { DemoRoleSwitcher } from './DemoRoleSwitcher';
import {
  Sparkles,
  ArrowRight,
  Menu,
  X,
  Calendar,
  UserPlus,
  ShieldCheck,
  Globe
} from 'lucide-react';

export function PublicNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinkClass = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
      isActive
        ? 'text-primary-600 bg-primary-50 font-bold'
        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
    }`;

  const mobileLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
      isActive
        ? 'text-primary-600 bg-primary-50 font-bold'
        : 'text-neutral-700 hover:bg-neutral-100'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand Name */}
          <div className="flex items-center gap-8 shrink-0">
            <Link to="/" className="flex items-center gap-3 group shrink-0">
              <div className="w-10 h-10 rounded-xl bg-primary-500 text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:bg-primary-600 transition-colors shrink-0">
                ATC
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-base font-extrabold text-neutral-900 tracking-tight leading-none group-hover:text-primary-600 transition-colors">
                  Advanced Tech Club
                </span>
                <span className="text-[11px] font-semibold text-neutral-400 tracking-wide mt-1 leading-none">
                  Official Campus Platform
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
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
            </nav>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Quick Persona Switcher for Testing */}
            <div className="hidden sm:block">
              <DemoRoleSwitcher />
            </div>

            {/* Enter Portal CTA Button */}
            <Link
              to="/portal"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 text-white text-xs font-bold hover:bg-primary-600 transition-colors shadow-sm"
            >
              Club Portal <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <div className="py-1">
            <DemoRoleSwitcher />
          </div>

          <div className="space-y-1">
            <NavLink
              to="/"
              end
              onClick={() => setMobileMenuOpen(false)}
              className={mobileLinkClass}
            >
              <Sparkles className="w-4 h-4" /> Home
            </NavLink>
            <NavLink
              to="/events"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileLinkClass}
            >
              <Calendar className="w-4 h-4" /> Public Events
            </NavLink>
            <NavLink
              to="/apply"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileLinkClass}
            >
              <UserPlus className="w-4 h-4" /> Apply to Join
            </NavLink>
            <NavLink
              to="/verification-status"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileLinkClass}
            >
              <ShieldCheck className="w-4 h-4" /> Check Verification Status
            </NavLink>

            <div className="pt-2">
              <Link
                to="/portal"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full btn-primary text-xs py-2.5 flex items-center justify-center gap-2 font-bold shadow-sm"
              >
                Launch Club Portal <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default PublicNavbar;
