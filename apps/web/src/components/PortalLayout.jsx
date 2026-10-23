import React, { useState } from 'react';
import { PortalSidebar } from './PortalSidebar';
import { PortalHeader } from './PortalHeader';
import { VerificationGate } from './VerificationGate';
import { Footer } from './Footer';

export function PortalLayout({ children }) {
  // Pinned state defaults to false: sidebar collapses to icon dock and auto-expands on hover
  const [isPinned, setIsPinned] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('atc_portal_sidebar_pinned') === 'true';
    }
    return false;
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleTogglePin = () => {
    setIsPinned((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('atc_portal_sidebar_pinned', String(next));
      }
      return next;
    });
  };

  return (
    <VerificationGate>
      <div className="min-h-screen bg-neutral-50 flex flex-col font-voodoo">
        {/* Hover-expand / Collapsible Sidebar */}
        <PortalSidebar
          isPinned={isPinned}
          onTogglePin={handleTogglePin}
          collapsed={!isPinned}
          onToggleCollapse={handleTogglePin}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        {/* Main Content Area: anchors at lg:pl-20 by default so hover-expansion floats without layout thrashing */}
        <div
          className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
            isPinned ? 'lg:pl-64' : 'lg:pl-20'
          }`}
        >
          {/* Top Portal Header */}
          <PortalHeader
            isPinned={isPinned}
            onTogglePin={handleTogglePin}
            collapsed={!isPinned}
            onToggleCollapse={handleTogglePin}
            onOpenMobile={() => setMobileOpen(true)}
          />

          {/* Page Content */}
          <main className="flex-1">
            {children}
          </main>

          {/* Portal Footer */}
          <Footer />
        </div>
      </div>
    </VerificationGate>
  );
}

export default PortalLayout;
