import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LucideIcon,
  LayoutDashboard,
  Headphones,
  Users,
  History,
  Laptop,
  Layers,
  Building2,
  ShoppingCart,
  Gift,
  Receipt,
  FileText,
  Wallet,
  X,

  ChevronRight,
  CircleUser,
  Settings,
  LogOut,
  PanelLeftClose,
} from 'lucide-react';
import { Avatar, Badge } from '../ui';
import { useAuth } from '../../context/AuthContext';
import {
  roleLabels,
  isITStaff,
  canAccessPurchasing,
  canAccessOfficeExpenses,
  canAccessAuditLogs,
  canAccessAssetCatalog,
  canAccessSoftwareCatalog,
  canAccessVendors,
  canViewRewardsAdmin,
  canViewAllEmployees,
} from '../../utils/auth';
import { ArcoLogo, ArcoMark } from '../common/ArcoLogo';

interface SidebarProps {
  isOpen?: boolean;
  isDesktopCollapsed?: boolean;
  onClose?: () => void;
  onExpandSidebar?: () => void;
  onCollapseSidebar?: () => void;
  onToggleSidebar?: () => void;
}

interface NavItemDef {
  to: string;
  icon: LucideIcon;
  label: string;
}

interface NavSectionDef {
  sectionTitle?: string;
  items: NavItemDef[];
}

function isNavItemActive(to: string, pathname: string): boolean {
  if (to === '/dashboard') {
    return pathname === '/dashboard' || pathname === '/';
  }
  if (to === '/service-desk') {
    return (
      pathname.startsWith('/service-desk') ||
      pathname.startsWith('/tickets') ||
      pathname.startsWith('/service-requests')
    );
  }
  if (to === '/assets') {
    return pathname.startsWith('/assets') && !pathname.startsWith('/my-assets');
  }
  if (to === '/my-assets') {
    return pathname.startsWith('/my-assets');
  }
  if (to === '/software') {
    return pathname.startsWith('/software') && !pathname.startsWith('/my-software');
  }
  if (to === '/my-software') {
    return pathname.startsWith('/my-software');
  }
  if (to === '/rewards') {
    return pathname.startsWith('/rewards') && !pathname.startsWith('/my-rewards');
  }
  if (to === '/my-rewards') {
    return pathname.startsWith('/my-rewards');
  }
  if (to === '/expenses') {

    return (pathname === '/expenses' || pathname.startsWith('/expenses/')) && !pathname.startsWith('/reimbursements');
  }
  if (to === '/reimbursements') {
    return pathname.startsWith('/reimbursements');
  }
  return pathname.startsWith(to);
}


export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = false,
  isDesktopCollapsed = false,
  onClose,
  onExpandSidebar,
  onCollapseSidebar,
  onToggleSidebar,
}) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const role = user?.role || 'employee';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAccountMenuOpen(false);
        accountButtonRef.current?.focus();
      }
    };

    if (isAccountMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  const handleProfileClick = () => {
    setIsAccountMenuOpen(false);
    onClose?.();
    navigate('/profile');
  };

  const handleLogout = async () => {
    setIsAccountMenuOpen(false);
    onClose?.();
    await logout();
    navigate('/login');
  };

  // Structured Sections: Exactly Two Clean Groups
  const operationsItems: NavItemDef[] = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/service-desk', icon: Headphones, label: 'IT Service Desk' },
    ...(canAccessAssetCatalog(role)
      ? [{ to: '/assets', icon: Laptop, label: 'Assets' }]
      : [{ to: '/my-assets', icon: Laptop, label: 'My Assets' }]),
    ...(canAccessSoftwareCatalog(role)
      ? [{ to: '/software', icon: Layers, label: 'Software & Licenses' }]
      : [{ to: '/my-software', icon: Layers, label: 'My Software' }]),
    ...(canAccessPurchasing(role)
      ? [{ to: '/procurement', icon: ShoppingCart, label: 'Purchasing' }]
      : []),
    ...(canAccessOfficeExpenses(role)
      ? [{ to: '/expenses', icon: Receipt, label: 'Office Expenses' }]
      : []),
    { to: '/reimbursements', icon: FileText, label: 'Reimbursements' },


  ];

  const peopleAdminItems: NavItemDef[] = [
    ...(canViewAllEmployees(role)
      ? [{ to: '/employees', icon: Users, label: 'Employees' }]
      : []),
    ...(canViewRewardsAdmin(role)
      ? [{ to: '/rewards', icon: Gift, label: 'Rewards & Recognition' }]
      : [{ to: '/my-rewards', icon: Gift, label: 'My Rewards' }]),
    ...(canAccessVendors(role)
      ? [{ to: '/vendors', icon: Building2, label: 'Vendors' }]
      : []),
    ...(canAccessAuditLogs(role)
      ? [{ to: '/audit', icon: History, label: 'Audit Logs' }]
      : []),
  ];

  const navSections: NavSectionDef[] = [
    { sectionTitle: 'OPERATIONS', items: operationsItems },
    ...(peopleAdminItems.length > 0 ? [{ sectionTitle: 'PEOPLE & ADMIN', items: peopleAdminItems }] : []),
  ];

  return (
    <aside
      className={`app-sidebar ${isOpen ? 'sidebar-open' : ''} ${isDesktopCollapsed ? 'sidebar-collapsed' : ''}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        backgroundColor: '#0B1739',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
      }}
    >
      {/* Brand Header */}
      {isDesktopCollapsed ? (
        <div
          style={{
            padding: '16px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            minHeight: '64px',
            boxSizing: 'border-box',
            position: 'relative',
            width: '100%',
          }}
        >
          <div className="sidebar-nav-item" style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => {
                if (onExpandSidebar) onExpandSidebar();
                else if (onToggleSidebar) onToggleSidebar();
              }}
              aria-label="Expand sidebar"
              className="sidebar-logo-btn"
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                outline: 'none',
              }}
            >
              <ArcoMark size={28} />
            </button>
            <div className="sidebar-nav-tooltip" role="tooltip">
              Expand sidebar
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '16px 14px 16px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            minHeight: '64px',
            boxSizing: 'border-box',
            position: 'relative',
          }}
        >
          <div
            onClick={() => {
              onClose?.();
              navigate('/dashboard');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              flex: 1,
              minWidth: 0,
            }}
          >
            <ArcoLogo theme="dark" markSize={28} />
          </div>

          {/* Desktop Collapse Trigger Button */}
          <button
            type="button"
            onClick={() => {
              if (onCollapseSidebar) onCollapseSidebar();
              else if (onToggleSidebar) onToggleSidebar();
            }}
            className="sidebar-collapse-btn"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            style={{
              background: 'none',
              border: 'none',
              color: '#98A2B3',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginLeft: '8px',
              transition: 'background-color 0.15s ease, color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#98A2B3';
            }}
          >
            <PanelLeftClose size={16} />
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="mobile-menu-toggle"
            aria-label="Close menu"
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'none',
            }}
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Nav Items Grouped by Sections */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: isDesktopCollapsed ? '12px 0' : '16px 10px 16px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: isDesktopCollapsed ? '6px' : '10px',
          alignItems: isDesktopCollapsed ? 'center' : 'stretch',
        }}
      >
        {navSections.map((section, sIdx) => (
          <div
            key={section.sectionTitle || sIdx}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
              width: isDesktopCollapsed ? 'auto' : '100%',
              alignItems: isDesktopCollapsed ? 'center' : 'stretch',
            }}
          >
            {!isDesktopCollapsed && section.sectionTitle && (
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#94A3B8',
                  letterSpacing: '0.08em',
                  padding: '6px 12px 6px 12px',
                  textTransform: 'uppercase',
                  userSelect: 'none',
                }}
              >
                {section.sectionTitle}
              </div>
            )}

            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = isNavItemActive(item.to, location.pathname);

              return (
                <div
                  key={item.to}
                  className="sidebar-nav-item"
                  style={{
                    position: 'relative',
                    width: isDesktopCollapsed ? '38px' : '100%',
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <NavLink
                    to={item.to}
                    onClick={() => onClose?.()}
                    aria-label={item.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: isDesktopCollapsed ? 'center' : 'flex-start',
                      gap: '10px',
                      padding: isDesktopCollapsed ? '0' : '7px 12px',
                      width: isDesktopCollapsed ? '38px' : '100%',
                      height: isDesktopCollapsed ? '38px' : 'auto',
                      margin: isDesktopCollapsed ? '0 auto' : '0',
                      borderRadius: '8px',
                      color: isActive ? '#FFFFFF' : '#94A3B8',
                      backgroundColor: isActive ? '#1E40AF' : 'transparent',
                      backgroundImage: isActive
                        ? 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)'
                        : 'none',
                      boxShadow: isActive ? '0 2px 8px rgba(30, 64, 175, 0.4)' : 'none',
                      border: 'none',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 500,
                      transition: 'all 0.15s ease',
                      boxSizing: 'border-box',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.color = '#FFFFFF';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#94A3B8';
                      }
                    }}
                  >
                    <Icon
                      size={17}
                      color={isActive ? '#FFFFFF' : '#94A3B8'}
                      style={{ flexShrink: 0 }}
                    />
                    {!isDesktopCollapsed && (
                      <span
                        className="nav-text-label"
                        style={{
                          flex: 1,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.3,
                        }}
                      >
                        {item.label}
                      </span>
                    )}
                  </NavLink>
                  {isDesktopCollapsed && (
                    <div className="sidebar-nav-tooltip" role="tooltip">
                      {item.label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Account Section */}
      {user && (
        <div
          ref={accountMenuRef}
          style={{
            position: 'relative',
            padding: isDesktopCollapsed ? '12px 0' : '12px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(0, 0, 0, 0.18)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: isDesktopCollapsed ? 'center' : 'stretch',
            gap: '8px',
          }}
        >
          {/* Popover Account Menu positioned above */}
          {isAccountMenuOpen && (
            <div
              role="menu"
              aria-orientation="vertical"
              aria-labelledby="sidebar-account-btn"
              style={{
                position: 'absolute',
                bottom: isDesktopCollapsed ? '0' : 'calc(100% + 8px)',
                left: isDesktopCollapsed ? 'calc(100% + 10px)' : '10px',
                right: isDesktopCollapsed ? 'auto' : '10px',
                width: isDesktopCollapsed ? '240px' : 'auto',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                boxShadow: '0 12px 24px -4px rgba(0, 0, 0, 0.25), 0 4px 8px -2px rgba(0, 0, 0, 0.15)',
                zIndex: 1000,
                overflow: 'hidden',
                animation: 'dropdownFadeIn 0.15s ease-out',
              }}
            >
              {/* Account Identity Header */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#F9FAFB',
                  borderBottom: '1px solid #E5E9F0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#172033',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user.full_name}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: '#667085',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user.email}
                </div>
                <div style={{ marginTop: '4px' }}>
                  <Badge variant={user.role} size="sm">
                    {roleLabels[user.role] || user.role}
                  </Badge>
                </div>
              </div>

              {/* Clean Menu Actions: Profile & Settings, Log out */}
              <div style={{ padding: '6px' }}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleProfileClick}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'none',
                    color: '#172033',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background-color 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F5F7FA';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <CircleUser size={16} color="#667085" />
                  <span>Profile &amp; Settings</span>
                </button>

                <div style={{ height: '1px', backgroundColor: '#E5E9F0', margin: '4px 0' }} />

                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'none',
                    color: '#DC2626',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background-color 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FEF2F2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <LogOut size={16} color="#DC2626" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          )}

          {/* Interactive User Profile Card Trigger */}
          <div
            className="sidebar-nav-item"
            style={{
              position: 'relative',
              width: isDesktopCollapsed ? '38px' : '100%',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <button
              id="sidebar-account-btn"
              ref={accountButtonRef}
              type="button"
              onClick={() => setIsAccountMenuOpen((prev) => !prev)}
              aria-label={`Account menu for ${user.full_name}`}
              aria-haspopup="menu"
              aria-expanded={isAccountMenuOpen}
              style={{
                width: isDesktopCollapsed ? '38px' : '100%',
                height: isDesktopCollapsed ? '38px' : 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isDesktopCollapsed ? 'center' : 'flex-start',
                gap: '8px',
                padding: isDesktopCollapsed ? '0' : '6px 8px',
                borderRadius: isDesktopCollapsed ? '7px' : '6px',
                backgroundColor: isAccountMenuOpen ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                border: isAccountMenuOpen ? '1px solid rgba(255, 255, 255, 0.22)' : '1px solid rgba(255, 255, 255, 0.08)',
                color: '#FFFFFF',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: isAccountMenuOpen ? '0 0 0 2px rgba(37, 99, 235, 0.4)' : 'none',
                boxSizing: 'border-box',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (!isAccountMenuOpen) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.16)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isAccountMenuOpen) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }
              }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Avatar name={user.full_name} size="sm" />
                <span
                  style={{
                    position: 'absolute',
                    bottom: '-1px',
                    right: '-1px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#16A34A',
                    border: '1.5px solid #0B1739',
                  }}
                />
              </div>

              {!isDesktopCollapsed && (
                <div className="user-text-block" style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#FFFFFF',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.25,
                      }}
                    >
                      {user.full_name}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#98A2B3',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: '1px',
                      }}
                    >
                      {roleLabels[user.role] || user.role}
                    </div>
                  </div>

                  <ChevronRight
                    size={14}
                    color="#98A2B3"
                    style={{
                      flexShrink: 0,
                      transform: isAccountMenuOpen ? 'rotate(-90deg)' : 'none',
                      transition: 'transform 0.15s ease',
                    }}
                  />
                </div>
              )}
            </button>
            {isDesktopCollapsed && !isAccountMenuOpen && (
              <div className="sidebar-nav-tooltip" role="tooltip">
                {user.full_name}
              </div>
            )}
          </div>

          {/* Micro System Status (Expanded only) */}
          {!isDesktopCollapsed && (
            <div
              className="system-status-block"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 4px',
                fontSize: '10px',
                color: '#98A2B3',
                letterSpacing: '0.2px',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <span>v1.0.0</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    backgroundColor: '#16A34A',
                  }}
                />
                <span style={{ color: '#98A2B3', fontWeight: 500 }}>Operational</span>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
