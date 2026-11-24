import React from 'react';
import {
  Check,
  Clock,
  Truck,
  FileText,
  CheckCircle2,
  PackageCheck,
  Layers,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import type { ProcurementRequestDetail } from '../../types/procurement';
import { formatDate, formatCurrency } from '../../utils/formatters';

interface OrderTrackingTimelineProps {
  procurement: ProcurementRequestDetail;
}

type MilestoneState = 'completed' | 'active' | 'pending' | 'rejected' | 'cancelled';

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

export const OrderTrackingTimeline: React.FC<OrderTrackingTimelineProps> = ({ procurement }) => {
  const isCancelled = procurement.status === 'cancelled';
  const isRejected = procurement.status === 'rejected';

  const receivingLogs = procurement.receiving_logs || [];
  const quotations = procurement.quotations || [];
  const createdAssets = procurement.created_assets || [];
  const totalQty = procurement.quantity || 1;
  const receivedQty = procurement.received_quantity || 0;
  const percentReceived = Math.min(100, Math.round((receivedQty / totalQty) * 100));

  // Determine milestone states
  const getQuotationsState = (): MilestoneState => {
    if (isCancelled) return 'cancelled';
    if (isRejected) return 'rejected';
    if (['approved', 'ordered', 'partially_received', 'received', 'completed'].includes(procurement.status)) {
      return 'completed';
    }
    if (['submitted', 'under_review', 'quotations_received', 'pending_approval'].includes(procurement.status)) {
      return 'active';
    }
    return 'pending';
  };

  const getOrderState = (): MilestoneState => {
    if (isCancelled || isRejected) return 'pending';
    if (['ordered', 'partially_received', 'received', 'completed'].includes(procurement.status)) {
      return 'completed';
    }
    if (procurement.status === 'approved') {
      return 'active';
    }
    return 'pending';
  };

  const getReceivingState = (): MilestoneState => {
    if (isCancelled || isRejected) return 'pending';
    if (['received', 'completed'].includes(procurement.status) || procurement.is_fully_received) {
      return 'completed';
    }
    if (['ordered', 'partially_received'].includes(procurement.status)) {
      return 'active';
    }
    return 'pending';
  };

  const getFulfillmentState = (): MilestoneState => {
    if (isCancelled || isRejected) return 'pending';
    if (procurement.status === 'completed') {
      return 'completed';
    }
    if (procurement.status === 'received') {
      return 'active';
    }
    return 'pending';
  };

  // Build Milestone list
  const milestones: Milestone[] = [
    {
      id: 'request',
      title: 'Request Placed',
      dateStr: procurement.created_at ? formatDate(procurement.created_at) : undefined,
      state: 'completed',
      subEvents: [
        {
          text: `Submitted by ${procurement.requester_name}`,
          subtext: procurement.department_name ? `Department: ${procurement.department_name}` : undefined,
        },
        {
          text: `${procurement.item_name} (${procurement.quantity} units • ${procurement.request_type})`,
          subtext: procurement.business_justification ? `"${procurement.business_justification}"` : undefined,
        },
        ...(procurement.required_by_date
          ? [{ text: `Target delivery by ${formatDate(procurement.required_by_date)}` }]
          : []),
      ],
    },
    {
      id: 'quotations',
      title: isRejected ? 'Proposal Rejected' : 'Quotations & Supplier Selection',
      dateStr: procurement.approved_date
        ? formatDate(procurement.approved_date)
        : procurement.rejected_date
        ? formatDate(procurement.rejected_date)
        : undefined,
      state: getQuotationsState(),
      subEvents: [
        ...(quotations.length > 0
          ? [
              {
                text: `${quotations.length} vendor proposal(s) attached`,
                subtext: procurement.selected_quotation_detail
                  ? `Selected: ${procurement.selected_quotation_detail.vendor_name || procurement.actual_vendor_detail?.name || 'Vendor'} (${formatCurrency(parseFloat(procurement.selected_quotation_detail.total_amount) || 0)})`
                  : 'Comparing proposals...',
              },
            ]
          : [
              {
                text: getQuotationsState() === 'active'
                  ? 'Collecting supplier quotations & reviews'
                  : 'Awaiting supplier quotation submissions',
              },
            ]),
        ...(procurement.approved_by_name
          ? [
              {
                text: `Approved by ${procurement.approved_by_name}`,
                subtext: procurement.approval_comment ? `"${procurement.approval_comment}"` : undefined,
                isImportant: true,
              },
            ]
          : []),
        ...(isRejected && procurement.rejected_by_name
          ? [
              {
                text: `Rejected by ${procurement.rejected_by_name}`,
                subtext: procurement.approval_comment ? `Reason: "${procurement.approval_comment}"` : undefined,
                isImportant: true,
              },
            ]
          : []),
      ],
    },
    {
      id: 'order',
      title: 'Order Placed & PO Issued',
      dateStr: procurement.order_date ? formatDate(procurement.order_date) : undefined,
      state: getOrderState(),
      subEvents: [
        ...(procurement.order_number
          ? [
              {
                text: `Purchase Order #${procurement.order_number} Issued`,
                subtext: procurement.actual_vendor_detail?.name
                  ? `Vendor: ${procurement.actual_vendor_detail.name}`
                  : undefined,
                isImportant: true,
              },
            ]
          : getOrderState() === 'active'
          ? [
              {
                text: 'Approved — Ready for Purchase Order dispatch',
              },
            ]
          : [
              {
                text: 'Purchase Order pending commercial approval',
              },
            ]),
        ...(procurement.expected_delivery_date
          ? [
              {
                text: `Expected Delivery: ${formatDate(procurement.expected_delivery_date)}`,
              },
            ]
          : []),
        ...(procurement.order_notes
          ? [
              {
                text: `Notes: ${procurement.order_notes}`,
              },
            ]
          : []),
      ],
    },
    {
      id: 'receiving',
      title: 'In-Transit & Delivery Receiving',
      dateStr: receivingLogs[0]?.received_date ? formatDate(receivingLogs[0].received_date) : undefined,
      state: getReceivingState(),
      subEvents: [
        ...(receivingLogs.length > 0
          ? [
              {
                text: `${receivedQty} of ${totalQty} items received (${percentReceived}%)`,
                subtext: procurement.is_fully_received ? 'All items accounted for' : `${procurement.pending_quantity} units pending`,
                isImportant: true,
              },
              ...receivingLogs.map((log) => ({
                text: `+${log.quantity_received} units received in ${log.condition} condition`,
                subtext: `Logged by ${log.received_by_name || 'Staff'} on ${formatDate(log.received_date)}${log.notes ? ` — "${log.notes}"` : ''}`,
              })),
            ]
          : getReceivingState() === 'active'
          ? [
              {
                text: 'Purchase Order active — Awaiting shipment & delivery',
              },
            ]
          : [
              {
                text: 'Delivery receiving begins upon PO issuance',
              },
            ]),
      ],
    },
    {
      id: 'fulfillment',
      title: 'Completed & Inventory Ingestion',
      dateStr: procurement.status === 'completed' && procurement.updated_at ? formatDate(procurement.updated_at) : undefined,
      state: getFulfillmentState(),
      subEvents: [
        ...(createdAssets.length > 0
          ? [
              {
                text: `${createdAssets.length} Hardware Assets created in inventory registry`,
                subtext: createdAssets.map((a) => a.asset_tag).join(', '),
                isImportant: true,
              },
            ]
          : []),
        ...(procurement.linked_software_name
          ? [
              {
                text: `${procurement.linked_software_licenses || procurement.quantity} Software Licenses allocated`,
                subtext: `Linked to ${procurement.linked_software_name} (${procurement.linked_software_code})`,
                isImportant: true,
              },
            ]
          : []),
        ...(procurement.status === 'completed'
          ? [
              {
                text: 'Order cycle completed and archived',
                isImportant: true,
              },
            ]
          : getFulfillmentState() === 'active'
          ? [
              {
                text: 'All items received — Ready for IT inventory linkage & completion',
              },
            ]
          : [
              {
                text: 'Downstream asset/license registration upon full delivery',
              },
            ]),
      ],
    },
  ];

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '10px',
        border: '1px solid #E5E9F0',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Truck size={18} color="#16A34A" />
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#172033', margin: 0 }}>
            Order Tracking
          </h4>
        </div>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: isCancelled ? '#DC2626' : isRejected ? '#DC2626' : procurement.status === 'completed' ? '#16A34A' : '#0284C7',
          }}
        >
          {isCancelled
            ? 'Cancelled'
            : isRejected
            ? 'Rejected'
            : procurement.status === 'completed'
            ? 'Fulfilled & Complete'
            : `${receivedQty}/${totalQty} Units Delivered`}
        </span>
      </div>

      {/* Progressive Tracking Steps */}
      <div style={{ position: 'relative', paddingLeft: '4px' }}>
        {milestones.map((ms, index) => {
          const isLast = index === milestones.length - 1;
          const isCompleted = ms.state === 'completed';
          const isActive = ms.state === 'active';
          const isCurrentRejected = ms.state === 'rejected';
          const isCurrentCancelled = ms.state === 'cancelled';
          const isPending = ms.state === 'pending';

          // Connecting line color: if current is completed and next is completed/active, green line
          const nextMilestone = milestones[index + 1];
          const lineIsGreen = isCompleted && nextMilestone && (nextMilestone.state === 'completed' || nextMilestone.state === 'active');

          return (
            <div
              key={ms.id}
              style={{
                position: 'relative',
                display: 'flex',
                gap: '14px',
                paddingBottom: isLast ? '0' : '22px',
              }}
            >
              {/* Left timeline line and icon node */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '24px',
                  flexShrink: 0,
                  position: 'relative',
                }}
              >
                {/* Node Icon Circle */}
                {isCompleted && (
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2,
                      boxShadow: '0 1px 3px rgba(22, 163, 74, 0.3)',
                    }}
                  >
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}

                {isActive && (
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#16A34A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2,
                      boxShadow: '0 0 0 4px rgba(34, 197, 94, 0.25)',
                    }}
                  >
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                      }}
                    />
                  </div>
                )}

                {isCurrentRejected && (
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#DC2626',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2,
                      boxShadow: '0 0 0 4px rgba(239, 68, 68, 0.25)',
                    }}
                  >
                    <XCircle size={13} strokeWidth={2.5} />
                  </div>
                )}

                {isCurrentCancelled && (
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#667085',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2,
                    }}
                  >
                    <XCircle size={13} />
                  </div>
                )}

                {isPending && (
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: '#F5F7FA',
                      border: '2px solid #E5E9F0',
                      zIndex: 2,
                      marginTop: '2px',
                    }}
                  />
                )}

                {/* Vertical connecting line to next node */}
                {!isLast && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '20px',
                      bottom: '-4px',
                      width: '2.5px',
                      backgroundColor: lineIsGreen ? '#16A34A' : '#E5E9F0',
                      zIndex: 1,
                      transition: 'background-color 0.2s ease',
                    }}
                  />
                )}
              </div>

              {/* Right Content */}
              <div style={{ flex: 1, paddingTop: '1px' }}>
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
                      fontWeight: isCompleted || isActive ? 700 : 500,
                      color: isCurrentRejected
                        ? '#DC2626'
                        : isCompleted
                        ? '#172033'
                        : isActive
                        ? '#16A34A'
                        : '#98A2B3',
                    }}
                  >
                    {ms.title}
                  </span>

                  {ms.dateStr && (
                    <span
                      style={{
                        fontSize: '11px',
                        color: isCompleted || isActive ? '#667085' : '#98A2B3',
                        fontWeight: 500,
                      }}
                    >
                      {ms.dateStr}
                    </span>
                  )}
                </div>

                {/* Sub-events */}
                {ms.subEvents.length > 0 && (
                  <div
                    style={{
                      marginTop: '5px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    {ms.subEvents.map((evt, eIdx) => (
                      <div
                        key={eIdx}
                        style={{
                          fontSize: '12px',
                          color: isPending ? '#98A2B3' : evt.isImportant ? '#172033' : '#475569',
                          lineHeight: 1.4,
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '6px',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            width: '4px',
                            height: '4px',
                            borderRadius: '50%',
                            backgroundColor: isPending ? '#E5E9F0' : '#98A2B3',
                            marginTop: '6px',
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: evt.isImportant ? 600 : 400 }}>{evt.text}</span>
                          {evt.subtext && (
                            <div style={{ fontSize: '11px', color: '#667085', marginTop: '1px' }}>
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
