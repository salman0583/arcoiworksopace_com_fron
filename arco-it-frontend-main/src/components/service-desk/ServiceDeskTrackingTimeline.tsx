import React from 'react';
import {
  Check,
  Clock,
  User,
  Wrench,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileText,
  ShieldCheck,
  Laptop,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { formatDate, formatDateTime, formatRelativeTime } from '../../utils/formatters';

export type RequestTimelineType = 'incident' | 'service_request';

export interface ServiceDeskTrackingItem {
  id: number;
  type: RequestTimelineType;
  request_id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  due_date?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  requester_name?: string;
  requester_email?: string;
  department_name?: string | null;
  category_name?: string | null;
  assigned_to_name?: string | null;
  assigned_to_role?: string | null;
  resolution_summary?: string | null;
  business_justification?: string | null;
  linked_asset?: { asset_tag: string; name?: string; type_name?: string; model?: string } | null;
  linked_software?: { name: string; license_type?: string } | null;
  vendor_support?: { name: string; case_number?: string } | null;
  history?: Array<{
    action?: string;
    note?: string;
    actor_name?: string;
    created_at?: string;
    timestamp?: string;
  }>;
  comments_count?: number;
  attachments_count?: number;
}

interface ServiceDeskTrackingTimelineProps {
  item: ServiceDeskTrackingItem;
}

type MilestoneState = 'completed' | 'active' | 'pending' | 'cancelled' | 'rejected';

interface SubEvent {
  text: string;
  subtext?: string;
  date?: string;
  isImportant?: boolean;
}

interface Milestone {
  id: string;
  title: string;
  dateStr?: string;
  state: MilestoneState;
  subEvents: SubEvent[];
}

export const ServiceDeskTrackingTimeline: React.FC<ServiceDeskTrackingTimelineProps> = ({ item }) => {
  const isCancelled = ['cancelled', 'closed_cancelled'].includes(item.status.toLowerCase());
  const isIncident = item.type === 'incident';
  const statusLower = item.status.toLowerCase();

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. INCIDENT LIFECYCLE MILESTONES (IT-2026-XXXX)
  // ─────────────────────────────────────────────────────────────────────────────
  const getIncidentMilestones = (): Milestone[] => {
    // 1. Request Logged (Always completed)
    const m1State: MilestoneState = 'completed';

    // 2. Triage & Assignment
    let m2State: MilestoneState = 'pending';
    if (isCancelled) {
      m2State = item.assigned_to_name ? 'completed' : 'cancelled';
    } else if (['resolved', 'closed'].includes(statusLower)) {
      m2State = 'completed';
    } else if (['in_progress', 'open', 'waiting_for_user', 'waiting_for_vendor'].includes(statusLower)) {
      m2State = 'completed';
    } else if (item.assigned_to_name) {
      m2State = 'completed';
    } else {
      m2State = 'active';
    }

    // 3. Diagnostics & Troubleshooting
    let m3State: MilestoneState = 'pending';
    if (isCancelled) {
      m3State = 'cancelled';
    } else if (['resolved', 'closed'].includes(statusLower)) {
      m3State = 'completed';
    } else if (['in_progress', 'open', 'waiting_for_user', 'waiting_for_vendor'].includes(statusLower)) {
      m3State = 'active';
    }

    // 4. Resolution & Verification
    let m4State: MilestoneState = 'pending';
    if (isCancelled) {
      m4State = 'cancelled';
    } else if (['resolved', 'closed'].includes(statusLower)) {
      m4State = 'completed';
    } else if (['in_progress', 'waiting_for_user', 'waiting_for_vendor'].includes(statusLower)) {
      m4State = 'pending';
    }

    // 5. Final Closure & Sign-Off
    let m5State: MilestoneState = 'pending';
    if (statusLower === 'closed') {
      m5State = 'completed';
    } else if (statusLower === 'resolved') {
      m5State = 'active';
    }

    const list: Milestone[] = [
      {
        id: 'inc-created',
        title: 'Incident Logged & Ticket Created',
        dateStr: item.created_at ? formatDateTime(item.created_at) : undefined,
        state: m1State,
        subEvents: [
          {
            text: `Submitted by ${item.requester_name || 'Requester'}`,
            subtext: item.department_name ? `Department: ${item.department_name}` : undefined,
            isImportant: true,
          },
          {
            text: `Priority assigned: ${item.priority.toUpperCase()}`,
            subtext: item.category_name ? `Category: ${item.category_name}` : undefined,
          },
          ...(item.due_date
            ? [
                {
                  text: `Target SLA Due: ${formatDateTime(item.due_date)}`,
                  isImportant: true,
                },
              ]
            : []),
        ],
      },
      {
        id: 'inc-assigned',
        title: 'Technician Assignment & Triage',
        dateStr: item.assigned_to_name ? undefined : undefined,
        state: m2State,
        subEvents: item.assigned_to_name
          ? [
              {
                text: `Assigned to ${item.assigned_to_name}`,
                subtext: item.assigned_to_role ? `Role: ${item.assigned_to_role}` : 'IT Support Specialist',
                isImportant: true,
              },
            ]
          : [
              {
                text: 'Awaiting technician assignment from IT queue',
                isImportant: m2State === 'active',
              },
            ],
      },
      {
        id: 'inc-investigation',
        title: 'Investigation & Troubleshooting',
        state: m3State,
        subEvents: [
          ...(statusLower === 'waiting_for_user'
            ? [
                {
                  text: 'Waiting for additional information / response from user',
                  isImportant: true,
                },
              ]
            : []),
          ...(statusLower === 'waiting_for_vendor'
            ? [
                {
                  text: `Waiting for Vendor Support (${item.vendor_support?.name || 'External Vendor'})`,
                  subtext: item.vendor_support?.case_number
                    ? `Vendor Case #: ${item.vendor_support.case_number}`
                    : undefined,
                  isImportant: true,
                },
              ]
            : []),
          ...(item.linked_asset
            ? [
                {
                  text: `Hardware Asset Inspected: ${item.linked_asset.name || item.linked_asset.asset_tag}`,
                  subtext: `Tag: ${item.linked_asset.asset_tag}`,
                },
              ]
            : []),
          ...(item.linked_software
            ? [
                {
                  text: `Software Package: ${item.linked_software.name}`,
                },
              ]
            : []),
          ...(item.comments_count && item.comments_count > 0
            ? [
                {
                  text: `${item.comments_count} communication / troubleshooting update(s) recorded`,
                },
              ]
            : []),
          ...(m3State === 'pending'
            ? [
                {
                  text: 'Diagnostics and resolution steps will begin once assigned',
                },
              ]
            : []),
        ],
      },
      {
        id: 'inc-resolved',
        title: 'Incident Resolved',
        dateStr: item.resolved_at ? formatDateTime(item.resolved_at) : undefined,
        state: m4State,
        subEvents: item.resolution_summary
          ? [
              {
                text: `Resolution Summary: ${item.resolution_summary}`,
                isImportant: true,
              },
            ]
          : m4State === 'completed'
          ? [
              {
                text: 'Resolution applied and verified by technician',
                isImportant: true,
              },
            ]
          : [
              {
                text: 'Technician will document resolution upon fix deployment',
              },
            ],
      },
      {
        id: 'inc-closed',
        title: 'Closed & Archived',
        dateStr: item.closed_at ? formatDateTime(item.closed_at) : undefined,
        state: m5State,
        subEvents: [
          {
            text:
              m5State === 'completed'
                ? 'Incident verified and closed permanently in records'
                : m5State === 'active'
                ? 'Resolved — pending final employee confirmation or auto-closure'
                : 'Final audit closure step',
          },
        ],
      },
    ];

    return list;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. SERVICE REQUEST LIFECYCLE MILESTONES (SR-2026-XXXX)
  // ─────────────────────────────────────────────────────────────────────────────
  const getServiceRequestMilestones = (): Milestone[] => {
    // 1. Submitted (Always completed)
    const m1State: MilestoneState = 'completed';

    // 2. Review & Approval
    let m2State: MilestoneState = 'pending';
    if (isCancelled) {
      m2State = 'cancelled';
    } else if (['approved', 'in_progress', 'completed'].includes(statusLower)) {
      m2State = 'completed';
    } else if (['submitted', 'under_review', 'pending_approval'].includes(statusLower)) {
      m2State = 'active';
    }

    // 3. Fulfillment Assignment
    let m3State: MilestoneState = 'pending';
    if (isCancelled) {
      m3State = 'cancelled';
    } else if (['in_progress', 'completed'].includes(statusLower)) {
      m3State = 'completed';
    } else if (item.assigned_to_name) {
      m3State = 'completed';
    } else if (statusLower === 'approved') {
      m3State = 'active';
    }

    // 4. Hardware / Software Provisioning
    let m4State: MilestoneState = 'pending';
    if (isCancelled) {
      m4State = 'cancelled';
    } else if (statusLower === 'completed') {
      m4State = 'completed';
    } else if (statusLower === 'in_progress') {
      m4State = 'active';
    }

    // 5. Handover & Completion
    let m5State: MilestoneState = 'pending';
    if (statusLower === 'completed') {
      m5State = 'completed';
    }

    const list: Milestone[] = [
      {
        id: 'sr-submitted',
        title: 'Service Request Placed',
        dateStr: item.created_at ? formatDateTime(item.created_at) : undefined,
        state: m1State,
        subEvents: [
          {
            text: `Submitted by ${item.requester_name || 'Requester'}`,
            subtext: item.department_name ? `Department: ${item.department_name}` : undefined,
            isImportant: true,
          },
          ...(item.business_justification
            ? [
                {
                  text: `Justification: "${item.business_justification}"`,
                },
              ]
            : []),
        ],
      },
      {
        id: 'sr-review',
        title: 'Review & Management Authorization',
        state: m2State,
        subEvents: [
          ...(m2State === 'completed'
            ? [
                {
                  text: 'Request reviewed and approved for IT fulfillment',
                  isImportant: true,
                },
              ]
            : m2State === 'active'
            ? [
                {
                  text: 'Under evaluation by IT Administrator / Manager',
                  isImportant: true,
                },
              ]
            : [
                {
                  text: 'Approval step pending previous phase',
                },
              ]),
        ],
      },
      {
        id: 'sr-fulfillment-assignment',
        title: 'Fulfillment Assignment',
        state: m3State,
        subEvents: item.assigned_to_name
          ? [
              {
                text: `Assigned to ${item.assigned_to_name}`,
                subtext: 'IT Operations Specialist',
                isImportant: true,
              },
            ]
          : [
              {
                text: m3State === 'active' ? 'Ready for assignment to technician' : 'Queued for assignment',
              },
            ],
      },
      {
        id: 'sr-provisioning',
        title: 'Device / Access Provisioning & Setup',
        state: m4State,
        subEvents: [
          ...(item.linked_asset
            ? [
                {
                  text: `Asset Allocated: ${item.linked_asset.name || item.linked_asset.asset_tag}`,
                  subtext: `Asset Tag: ${item.linked_asset.asset_tag}`,
                  isImportant: true,
                },
              ]
            : []),
          ...(item.linked_software
            ? [
                {
                  text: `Software License Assigned: ${item.linked_software.name}`,
                  isImportant: true,
                },
              ]
            : []),
          ...(m4State === 'active'
            ? [
                {
                  text: 'Configuration, asset preparation, and security enrollment in progress',
                  isImportant: true,
                },
              ]
            : []),
          ...(m4State === 'pending'
            ? [
                {
                  text: 'Equipment handover or license provisioning pending',
                },
              ]
            : []),
        ],
      },
      {
        id: 'sr-completed',
        title: 'Delivered & Completed',
        dateStr: item.resolved_at ? formatDateTime(item.resolved_at) : undefined,
        state: m5State,
        subEvents: [
          {
            text:
              m5State === 'completed'
                ? 'Equipment/access handed over and acknowledged by requester'
                : 'Final handover and sign-off',
          },
        ],
      },
    ];

    return list;
  };

  const milestones = isIncident ? getIncidentMilestones() : getServiceRequestMilestones();

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E9F0',
        borderRadius: '10px',
        padding: '18px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '18px',
          paddingBottom: '12px',
          borderBottom: '1px solid #F5F7FA',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isCancelled ? '#EF4444' : '#10B981',
              boxShadow: isCancelled ? '0 0 6px rgba(239,68,68,0.4)' : '0 0 8px rgba(16,185,129,0.5)',
            }}
          />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#172033', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Request Lifecycle Tracking
          </span>
        </div>

        <span
          style={{
            fontSize: '11px',
            fontFamily: 'monospace',
            fontWeight: 700,
            color: '#2563EB',
            backgroundColor: '#EFF6FF',
            padding: '2px 8px',
            borderRadius: '4px',
            border: '1px solid #DBEAFE',
          }}
        >
          {item.request_id}
        </span>
      </div>

      {/* Vertical Progressive Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {milestones.map((m, idx) => {
          const isLast = idx === milestones.length - 1;
          const isCompleted = m.state === 'completed';
          const isActive = m.state === 'active';
          const isFailed = m.state === 'cancelled' || m.state === 'rejected';
          const isPending = m.state === 'pending';

          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                gap: '16px',
                position: 'relative',
                minHeight: isLast ? 'auto' : '58px',
              }}
            >
              {/* Left Connector Column */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '28px',
                  flexShrink: 0,
                }}
              >
                {/* Node Icon */}
                {isCompleted ? (
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2,
                      boxShadow: '0 2px 4px rgba(16,185,129,0.3)',
                    }}
                  >
                    <Check size={13} strokeWidth={3} />
                  </div>
                ) : isActive ? (
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: '#EFF6FF',
                      border: '2px solid #2563EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2,
                      boxShadow: '0 0 0 4px rgba(37, 99, 235,0.18)',
                    }}
                  >
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#2563EB',
                      }}
                    />
                  </div>
                ) : isFailed ? (
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: '#EF4444',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2,
                    }}
                  >
                    <XCircle size={13} />
                  </div>
                ) : (
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: '#FFFFFF',
                      border: '2px solid #E5E9F0',
                      zIndex: 2,
                      marginTop: '2px',
                    }}
                  />
                )}

                {/* Progressive Vertical Connecting Line */}
                {!isLast && (
                  <div
                    style={{
                      width: '2px',
                      flex: 1,
                      backgroundColor: isCompleted ? '#10B981' : isActive ? '#93C5FD' : '#E5E9F0',
                      margin: '4px 0',
                    }}
                  />
                )}
              </div>

              {/* Right Content Column */}
              <div
                style={{
                  flex: 1,
                  paddingBottom: isLast ? '4px' : '18px',
                }}
              >
                {/* Title and Date row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '6px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: isActive ? 700 : isCompleted ? 600 : 500,
                      color: isFailed ? '#DC2626' : isActive ? '#172033' : isCompleted ? '#172033' : '#98A2B3',
                    }}
                  >
                    {m.title}
                  </span>
                  {m.dateStr && (
                    <span style={{ fontSize: '11px', color: '#667085', fontWeight: 500 }}>
                      {m.dateStr}
                    </span>
                  )}
                </div>

                {/* Sub-events */}
                {m.subEvents.length > 0 && (
                  <div style={{ marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {m.subEvents.map((evt, eIdx) => (
                      <div
                        key={eIdx}
                        style={{
                          fontSize: '12px',
                          color: evt.isImportant
                            ? isCompleted || isActive
                              ? '#475467'
                              : '#667085'
                            : '#667085',
                          lineHeight: 1.4,
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '6px',
                        }}
                      >
                        <span style={{ color: isCompleted ? '#10B981' : isActive ? '#2563EB' : '#E5E9F0', fontSize: '9px', marginTop: '3px' }}>
                          ●
                        </span>
                        <div>
                          <span style={{ fontWeight: evt.isImportant ? 600 : 400 }}>{evt.text}</span>
                          {evt.subtext && (
                            <div style={{ fontSize: '11px', color: '#98A2B3', marginTop: '1px' }}>
                              {evt.subtext}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
