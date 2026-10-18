import React, { useState } from 'react';
import { PortalSidebar } from './PortalSidebar';
import { PortalHeader } from './PortalHeader';
import { VerificationGate } from './VerificationGate';
import { Footer } from './Footer';

export function PortalLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <VerificationGate>
      <div className="min-h-screen bg-neutral-50 flex flex-col font-voodoo">
        {/* Collapsible Sidebar */}
        <PortalSidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        {/* Main Content Area */}
        <div
          className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
            collapsed ? 'lg:pl-20' : 'lg:pl-64'
          }`}
        >
          {/* Top Portal Header */}
          <PortalHeader
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed(!collapsed)}
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
