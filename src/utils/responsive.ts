// frontend/src/utils/responsive.ts
/**
 * Centralized responsive layout constants, breakpoint standards, and utilities
 * for ARCO Workplace SaaS platform.
 * 
 * Reusable across Dashboard and all future workspace modules.
 */
import { useState, useEffect } from 'react';

export const BREAKPOINTS = {
  sm: 480,        // Small Mobile (< 480px)
  md: 768,        // Mobile & Phablet (481px - 768px)
  lg: 1024,       // Tablet Landscape / Compact Laptop (769px - 1024px)
  xl: 1440,       // Standard Laptop (1025px - 1440px)
  xxl: 1920,      // Desktop 1080p (1441px - 1920px)
  ultrawide: 2560 // 2K/4K Large Displays (>= 1921px)
} as const;

export const MEDIA_QUERIES = {
  mobileOnly: `(max-width: ${BREAKPOINTS.md}px)`,
  tabletOnly: `(min-width: ${BREAKPOINTS.md + 1}px) and (max-width: ${BREAKPOINTS.lg}px)`,
  compactScreen: `(max-width: ${BREAKPOINTS.lg}px)`,
  laptopUp: `(min-width: ${BREAKPOINTS.lg + 1}px)`,
  desktopUp: `(min-width: ${BREAKPOINTS.xl + 1}px)`,
} as const;

export interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isLaptop: boolean;
  isDesktop: boolean;
  width: number;
}

/**
 * Shared hook to detect viewport breakpoints without duplicating resize listeners.
 */
export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
    return {
      isMobile: w <= BREAKPOINTS.md,
      isTablet: w > BREAKPOINTS.md && w <= BREAKPOINTS.lg,
      isLaptop: w > BREAKPOINTS.lg && w <= BREAKPOINTS.xl,
      isDesktop: w > BREAKPOINTS.xl,
      width: w,
    };
  });

  useEffect(() => {
    let timeoutId: number | undefined;

    const handleResize = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        const w = window.innerWidth;
        setState({
          isMobile: w <= BREAKPOINTS.md,
          isTablet: w > BREAKPOINTS.md && w <= BREAKPOINTS.lg,
          isLaptop: w > BREAKPOINTS.lg && w <= BREAKPOINTS.xl,
          isDesktop: w > BREAKPOINTS.xl,
          width: w,
        });
      }, 50);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.clearTimeout(timeoutId);
    };
  }, []);

  return state;
}

/**
 * Standard CSS classes defined in index.css for centralized layout usage.
 */
export const LAYOUT_CLASSES = {
  pageContainer: 'app-page-container',
  statGrid: 'stat-card-grid',
  statGrid3: 'stat-card-grid-3',
  statGrid4: 'stat-card-grid-4',
  statGrid5: 'stat-card-grid-5',
  summaryMiniGrid: 'summary-cards-mini-grid',
  dashboardGrid2Col: 'dashboard-grid-2col',
  dashboardCard: 'dashboard-card',
  dashboardCardHeader: 'dashboard-card-header',
  dashboardCardBody: 'dashboard-card-body',
  dashboardEmptyCompact: 'dashboard-empty-compact',
  dashboardPillMetric: 'dashboard-pill-metric',
  dashboardActionToolbar: 'dashboard-action-toolbar',
} as const;
