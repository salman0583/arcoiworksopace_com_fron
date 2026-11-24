import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';

export interface PageHeaderBreadcrumb {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  backButton?:
    | {
        label?: string;
        onClick: () => void;
      }
    | React.ReactNode;
  breadcrumbs?: PageHeaderBreadcrumb[];
  style?: React.CSSProperties;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  description,
  badge,
  actions,
  backButton,
  breadcrumbs,
  style,
  className = '',
}) => {
  const displaySubtitle = description || subtitle;

  return (
    <div
      className={`app-page-header ${className}`.trim()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        marginBottom: '4px',
        ...style,
      }}
    >
      {/* Breadcrumbs / Back navigation */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#667085',
            marginBottom: '2px',
          }}
        >
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={idx}>
                {crumb.onClick ? (
                  <button
                    type="button"
                    onClick={crumb.onClick}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: isLast ? '#172033' : '#667085',
                      fontWeight: isLast ? 600 : 500,
                      cursor: isLast ? 'default' : 'pointer',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                    }}
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span
                    style={{
                      color: isLast ? '#172033' : '#667085',
                      fontWeight: isLast ? 600 : 500,
                    }}
                  >
                    {crumb.label}
                  </span>
                )}
                {!isLast && <ChevronRight size={13} color="#98A2B3" />}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {backButton && typeof backButton === 'object' && 'onClick' in backButton && (
        <button
          type="button"
          onClick={backButton.onClick}
          className="detail-back-button"
          style={{ width: 'fit-content' }}
        >
          <ArrowLeft size={13} />
          <span>{backButton.label || 'Back'}</span>
        </button>
      )}

      {backButton && React.isValidElement(backButton) && backButton}

      {/* Main Title + Actions Bar */}
      <div
        className="page-header-row"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div className="page-header-title-block" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#172033',
              margin: 0,
              lineHeight: 1.25,
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </h1>
          {badge}
        </div>

        {actions && (
          <div
            className="page-header-actions"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            {actions}
          </div>
        )}
      </div>

      {/* Subtitle / Description */}
      {displaySubtitle && (
        <p
          style={{
            fontSize: '13px',
            color: '#667085',
            margin: '2px 0 0 0',
            lineHeight: 1.45,
          }}
        >
          {displaySubtitle}
        </p>
      )}
    </div>
  );
};
