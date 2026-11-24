import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, ExternalLink, Inbox } from 'lucide-react';
import { coreApi } from '../../api/core';
import type { InAppNotification } from '../../types';
import { logger } from '../../utils/logger';

function formatRelativeTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
}

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Fetch only unread notifications so read items clear from the dropdown
  const fetchNotifications = async () => {
    try {
      const data = await coreApi.getNotifications(1, true);
      setNotifications(data?.results || []);
      setUnreadCount(data?.unread_count || 0);
    } catch (err) {
      logger.error('Notifications', 'Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleNotificationClick = async (n: InAppNotification) => {
    // Immediately remove from dropdown and decrement count
    setNotifications(prev => prev.filter(item => item.id !== n.id));
    setUnreadCount(c => Math.max(0, c - 1));

    if (!n.is_read) {
      try {
        await coreApi.markNotificationRead(n.id);
      } catch (err) {
        logger.error('Notifications', `Failed to mark notification ${n.id} read`, err);
      }
    }
    setIsOpen(false);
    if (n.ticket) {
      navigate(`/tickets/${n.ticket}`);
    }
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    // Immediately clear list and unread count in UI
    setNotifications([]);
    setUnreadCount(0);
    try {
      await coreApi.markAllNotificationsRead();
    } catch (err) {
      logger.error('Notifications', 'Failed to mark all read', err);
      // Re-fetch in case of network failure
      fetchNotifications();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={popoverRef}>
      <button
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (next) fetchNotifications();
        }}
        style={{
          position: 'relative',
          backgroundColor: isOpen ? '#F5F7FA' : 'transparent',
          border: 'none',
          borderRadius: '8px',
          padding: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#667085',
          transition: 'background-color 0.15s',
        }}
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: 700,
              height: '18px',
              minWidth: '18px',
              padding: '0 4px',
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              border: '2px solid #FFFFFF',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '360px',
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid #E5E9F0',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '1px solid #E5E9F0',
              backgroundColor: '#F9FAFB',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#172033' }}>Notifications</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: '#EFF6FF',
                    color: '#175CD3',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '10px',
                  }}
                >
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#2563EB',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '2px 6px',
                }}
              >
                <Check size={13} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: '#98A2B3' }}>
                <Inbox size={32} style={{ margin: '0 auto 8px', opacity: 0.7 }} />
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#667085' }}>No unread notifications</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #E5E9F0',
                    backgroundColor: '#F5F7FA',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = '#EFF6FF';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = '#F5F7FA';
                  }}
                >
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#2563EB',
                      marginTop: '5px',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#172033' }}>
                        {n.title}
                      </span>
                      <span style={{ fontSize: '11px', color: '#98A2B3', whiteSpace: 'nowrap' }}>
                        {formatRelativeTime(n.created_at)}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#667085', margin: '3px 0 0', lineHeight: 1.4 }}>
                      {n.message}
                    </p>
                    {n.ticket_number && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '11px',
                          color: '#2563EB',
                          fontWeight: 600,
                          marginTop: '4px',
                        }}
                      >
                        {n.ticket_number} <ExternalLink size={10} />
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
