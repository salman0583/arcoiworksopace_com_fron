import React from 'react';
import { Menu } from 'lucide-react';
import { NotificationBell } from './NotificationBell';

interface HeaderProps {
  onToggleSidebar?: () => void;
  onToggleMobileMenu?: () => void;
  isDesktopCollapsed?: boolean;
  isMobileOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onToggleMobileMenu,
}) => {
  const handleToggle = () => {
    if (onToggleSidebar) {
      onToggleSidebar();
    } else if (onToggleMobileMenu) {
      onToggleMobileMenu();
    }
  };

  return (
    <header
      style={{
        height: 'var(--header-height)',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
      }}
    >
      {/* Left: Mobile Drawer Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        {/* Mobile menu trigger button - visible only on screens <= 768px */}
        <button
          type="button"
          onClick={handleToggle}
          className="mobile-menu-toggle"
          aria-label="Open menu"
          title="Open menu"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#475467',
            transition: 'background-color 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F8FAFC';
            e.currentTarget.style.color = '#1E40AF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#475467';
          }}
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Right: Notification Center */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <NotificationBell />
      </div>
    </header>
  );
};
