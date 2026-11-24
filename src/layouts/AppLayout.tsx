import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { SessionWarningModal } from '../components/auth/SessionWarningModal';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('arco_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setMobileMenuOpen((prev) => !prev);
    } else {
      setIsDesktopCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem('arco_sidebar_collapsed', String(next));
        } catch {
          // ignore
        }
        return next;
      });
    }
  };

  const handleExpandSidebar = () => {
    if (window.innerWidth <= 768) {
      setMobileMenuOpen(true);
    } else {
      setIsDesktopCollapsed(false);
      try {
        localStorage.setItem('arco_sidebar_collapsed', 'false');
      } catch {
        // ignore
      }
    }
  };

  const handleCollapseSidebar = () => {
    if (window.innerWidth <= 768) {
      setMobileMenuOpen(false);
    } else {
      setIsDesktopCollapsed(true);
      try {
        localStorage.setItem('arco_sidebar_collapsed', 'true');
      } catch {
        // ignore
      }
    }
  };

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileMenuOpen]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-app-background)', position: 'relative' }}>
      <SessionWarningModal />
      <Sidebar
        isOpen={mobileMenuOpen}
        isDesktopCollapsed={isDesktopCollapsed}
        onClose={() => setMobileMenuOpen(false)}
        onExpandSidebar={handleExpandSidebar}
        onCollapseSidebar={handleCollapseSidebar}
        onToggleSidebar={handleToggleSidebar}
      />
      {mobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 35,
          }}
        />
      )}
      <div
        className={`app-main-content ${isDesktopCollapsed ? 'sidebar-collapsed' : ''}`}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: '100vh',
        }}
      >
        <Header
          onToggleSidebar={handleToggleSidebar}
          isDesktopCollapsed={isDesktopCollapsed}
          isMobileOpen={mobileMenuOpen}
        />
        <main
          className="app-main-body"
          style={{
            padding: 'var(--app-page-padding-y, 16px) var(--app-page-padding-x, 20px)',
            flex: 1,
            minHeight: 0,
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div className="app-page-container">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
};


