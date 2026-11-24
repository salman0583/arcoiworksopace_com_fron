import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  ArrowLeft,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Globe,
  MapPin,
  FileText,
  Laptop,
  Layers,
  PlusCircle,
  Clock,
  UserCheck,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { vendorsApi } from '../../api/vendors';
import {
  VendorTypeBadge,
  VendorStatusBadge,
  ContractStatusBadge,
  ContractTypeBadge,
} from '../../components/vendors/VendorBadges';
import { EditVendorModal } from './EditVendorModal';
import { AddContactModal } from './AddContactModal';
import { AddContractModal } from './AddContractModal';
import { EditContractModal } from './EditContractModal';
import type { VendorDetail as VendorDetailType, Contract } from '../../types/vendors';

export const VendorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isITAdmin = user?.role === 'it_admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';
  const isEmployee = user?.role === 'employee';

  const [vendor, setVendor] = useState<VendorDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isEditVendorOpen, setIsEditVendorOpen] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isAddContractOpen, setIsAddContractOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  // Delete state
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (isEmployee) {
      navigate('/dashboard', { replace: true });
    }
  }, [isEmployee, navigate]);

  const loadVendor = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await vendorsApi.get(Number(id));
      setVendor(data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load vendor details:', err);
      setError('Vendor not found or access denied.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadVendor();
  }, [loadVendor]);

  const handleDeleteVendor = async () => {
    if (!vendor) return;
    if (!window.confirm(`Are you sure you want to delete vendor "${vendor.name}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await vendorsApi.delete(vendor.id);
      navigate('/vendors');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to delete vendor.';
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteContact = async (contactId: number, contactName: string) => {
    if (!window.confirm(`Remove contact "${contactName}"?`)) return;
    try {
      await vendorsApi.deleteContact(contactId);
      loadVendor();
    } catch (err) {
      alert('Failed to remove contact.');
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#667085' }}>
        Loading vendor profile...
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ color: '#EF4444', marginBottom: '16px' }}>{error || 'Vendor not found'}</div>
        <Button variant="secondary" onClick={() => navigate('/vendors')}>
          Back to Vendors
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '20px' }}>
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/vendors')}
          className="detail-back-button"
        >
          <ArrowLeft size={14} strokeWidth={2.2} style={{ color: '#2563EB' }} />
          <span>Back to Vendors Directory</span>
        </button>
      </div>

      {/* Delete error notification */}
      {deleteError && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECDD3',
            borderRadius: '8px',
            color: '#B42318',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ShieldAlert size={16} style={{ flexShrink: 0 }} />
          <span>{deleteError}</span>
        </div>
      )}

      {/* Header card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E5E9F0',
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '8px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Building2 size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#172033', margin: 0, lineHeight: 1.2 }}>
                {vendor.name}
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: '#F5F7FA',
                  color: '#475569',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                }}
              >
                {vendor.vendor_id}
              </span>
              <VendorStatusBadge status={vendor.status} />
              <VendorTypeBadge type={vendor.vendor_type} />
            </div>
            <p style={{ fontSize: '13px', color: '#667085', margin: '4px 0 0' }}>
              {vendor.city}, {vendor.country} {vendor.tax_id ? `• TRN: ${vendor.tax_id}` : ''}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {isITAdmin && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEditVendorOpen(true)}
              leftIcon={<Edit2 size={14} />}
            >
              Edit Vendor
            </Button>
          )}
          {isSuperAdmin && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteVendor}
              isLoading={isDeleting}
              leftIcon={<Trash2 size={14} />}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="vendor-detail-grid">
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Company & Support Overview */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E5E9F0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#172033', marginBottom: '16px' }}>
              Profile & Support Escalation
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#667085', display: 'block', marginBottom: '2px' }}>
                  Technical Support Email
                </span>
                {vendor.support_email ? (
                  <a
                    href={`mailto:${vendor.support_email}`}
                    style={{ fontSize: '13px', fontWeight: 500, color: '#2563EB', textDecoration: 'none' }}
                  >
                    {vendor.support_email}
                  </a>
                ) : (
                  <span style={{ fontSize: '13px', color: '#98A2B3' }}>—</span>
                )}
              </div>

              <div>
                <span style={{ fontSize: '12px', color: '#667085', display: 'block', marginBottom: '2px' }}>
                  Technical Support Phone / Toll Free
                </span>
                {vendor.support_phone ? (
                  <a
                    href={`tel:${vendor.support_phone}`}
                    style={{ fontSize: '13px', fontWeight: 500, color: '#172033', textDecoration: 'none' }}
                  >
                    {vendor.support_phone}
                  </a>
                ) : (
                  <span style={{ fontSize: '13px', color: '#98A2B3' }}>—</span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#667085', display: 'block', marginBottom: '2px' }}>
                  Website / Customer Portal
                </span>
                {vendor.website ? (
                  <a
                    href={vendor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '13px', fontWeight: 500, color: '#2563EB', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    {vendor.website}
                    <ExternalLink size={12} />
                  </a>
                ) : (
                  <span style={{ fontSize: '13px', color: '#98A2B3' }}>—</span>
                )}
              </div>

              <div>
                <span style={{ fontSize: '12px', color: '#667085', display: 'block', marginBottom: '2px' }}>
                  Address
                </span>
                <span style={{ fontSize: '13px', color: '#475467' }}>
                  {vendor.address || `${vendor.city}, ${vendor.country}`}
                </span>
              </div>
            </div>

            {vendor.notes && (
              <div style={{ borderTop: '1px solid #F5F7FA', paddingTop: '12px', marginTop: '12px' }}>
                <span style={{ fontSize: '12px', color: '#667085', display: 'block', marginBottom: '4px' }}>
                  Internal IT Notes
                </span>
                <p style={{ fontSize: '13px', color: '#475467', lineHeight: 1.5, margin: 0 }}>
                  {vendor.notes}
                </p>
              </div>
            )}
          </div>

          {/* Contracts & Service Agreements Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E5E9F0',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E5E9F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#172033', margin: 0 }}>
                  Contracts & Maintenance Agreements ({vendor.contracts.length})
                </h3>
                <p style={{ fontSize: '12px', color: '#667085', margin: '2px 0 0' }}>
                  Hardware AMC, software subscription, and dedicated SLA agreements
                </p>
              </div>
              {isITAdmin && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAddContractOpen(true)}
                  leftIcon={<PlusCircle size={14} />}
                >
                  Add Contract
                </Button>
              )}
            </div>

            {vendor.contracts.length === 0 ? (
              <div style={{ padding: '28px', textAlign: 'center', color: '#667085', fontSize: '13px' }}>
                No contracts registered with this vendor.
              </div>
            ) : (
              <div className="contracts-table-viewport">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E9F0', color: '#667085', fontWeight: 600 }}>
                      <th style={{ padding: '10px 16px' }}>Contract Name</th>
                      <th style={{ padding: '10px 16px' }}>Type</th>
                      <th style={{ padding: '10px 16px' }}>End Date</th>
                      <th style={{ padding: '10px 16px' }}>Status</th>
                      {isITAdmin && <th style={{ padding: '10px 16px', textAlign: 'right' }}>Value</th>}
                      {isITAdmin && <th style={{ padding: '10px 16px', textAlign: 'right' }}>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {vendor.contracts.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #F5F7FA' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#172033' }}>{c.name}</div>
                          <div style={{ fontSize: '11px', color: '#667085' }}>{c.contract_id}</div>
                          {c.support_notes && (
                            <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', fontStyle: 'italic' }}>
                              {c.support_notes}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <ContractTypeBadge type={c.contract_type} />
                        </td>
                        <td style={{ padding: '12px 16px' }}>{c.end_date}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <ContractStatusBadge status={c.computed_status} daysRemaining={c.days_remaining} />
                        </td>
                        {isITAdmin && (
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#172033' }}>
                            {formatCurrency(c.contract_value, c.currency === 'AED' ? 'AED ' : (c.currency === 'USD' ? '$' : (c.currency === 'EUR' ? '€' : '₹')))}
                          </td>
                        )}
                        {isITAdmin && (
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingContract(c)}
                            >
                              Edit / Renew
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Additional Contacts Table */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E5E9F0',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E5E9F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#172033', margin: 0 }}>
                  Authorized Contacts ({vendor.contacts.length})
                </h3>
                <p style={{ fontSize: '12px', color: '#667085', margin: '2px 0 0' }}>
                  Sales representatives, escalation engineers, and billing leads
                </p>
              </div>
              {isITAdmin && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAddContactOpen(true)}
                  leftIcon={<PlusCircle size={14} />}
                >
                  Add Contact
                </Button>
              )}
            </div>

            {vendor.contacts.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#667085', fontSize: '13px' }}>
                No extra contacts listed.
              </div>
            ) : (
              <div className="contracts-table-viewport">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E9F0', color: '#667085', fontWeight: 600 }}>
                      <th style={{ padding: '10px 16px' }}>Name & Role</th>
                      <th style={{ padding: '10px 16px' }}>Category</th>
                      <th style={{ padding: '10px 16px' }}>Email</th>
                      <th style={{ padding: '10px 16px' }}>Phone</th>
                      {isITAdmin && <th style={{ padding: '10px 16px', textAlign: 'right' }}>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {vendor.contacts.map(ct => (
                      <tr key={ct.id} style={{ borderBottom: '1px solid #F5F7FA' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#172033', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {ct.name}
                            {ct.is_primary && (
                              <span style={{ fontSize: '10px', backgroundColor: '#EFF6FF', color: '#2563EB', padding: '1px 6px', borderRadius: '4px' }}>
                                Primary
                              </span>
                            )}
                          </div>
                          {ct.role_title && <div style={{ fontSize: '12px', color: '#667085' }}>{ct.role_title}</div>}
                        </td>
                        <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: '#475569' }}>
                          {ct.contact_type}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {ct.email ? (
                            <a href={`mailto:${ct.email}`} style={{ color: '#2563EB', textDecoration: 'none' }}>
                              {ct.email}
                            </a>
                          ) : (
                            <span style={{ color: '#98A2B3' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {ct.phone ? (
                            <a href={`tel:${ct.phone}`} style={{ color: '#172033', textDecoration: 'none' }}>
                              {ct.phone}
                            </a>
                          ) : (
                            <span style={{ color: '#98A2B3' }}>—</span>
                          )}
                        </td>
                        {isITAdmin && (
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              style={{ color: '#EF4444' }}
                              onClick={() => handleDeleteContact(ct.id, ct.name)}
                            >
                              Remove
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Supplied Assets Section */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E5E9F0',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E9F0' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#172033', margin: 0 }}>
                Assets Supplied ({vendor.supplied_assets.length})
              </h3>
              <p style={{ fontSize: '12px', color: '#667085', margin: '2px 0 0' }}>
                Hardware inventory procured through or maintained by this vendor
              </p>
            </div>

            {vendor.supplied_assets.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#667085', fontSize: '13px' }}>
                No assets currently linked to this vendor.
              </div>
            ) : (
              <div className="contracts-table-viewport">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E9F0', color: '#667085', fontWeight: 600 }}>
                      <th style={{ padding: '10px 16px' }}>Asset Tag</th>
                      <th style={{ padding: '10px 16px' }}>Device Name</th>
                      <th style={{ padding: '10px 16px' }}>Serial Number</th>
                      <th style={{ padding: '10px 16px' }}>Status</th>
                      <th style={{ padding: '10px 16px' }}>Warranty</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendor.supplied_assets.map(a => (
                      <tr key={a.id} style={{ borderBottom: '1px solid #F5F7FA' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#2563EB' }}>
                          {a.asset_tag}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 500, color: '#172033' }}>{a.name}</div>
                          <div style={{ fontSize: '11px', color: '#667085' }}>{a.model}</div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569', fontFamily: 'monospace' }}>
                          {a.serial_number || '—'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ textTransform: 'capitalize', fontSize: '12px' }}>{a.status}</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '12px' }}>
                          {a.warranty_end_date ? `${a.warranty_status} (until ${a.warranty_end_date})` : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/assets/${a.id}`)}
                          >
                            View Asset
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Software Licenses Section */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E5E9F0',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E9F0' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#172033', margin: 0 }}>
                Software Licenses & SaaS ({vendor.software_licenses.length})
              </h3>
              <p style={{ fontSize: '12px', color: '#667085', margin: '2px 0 0' }}>
                Application packages and cloud services procured from or licensed through this partner
              </p>
            </div>

            {vendor.software_licenses.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#667085', fontSize: '13px' }}>
                No software packages linked to this vendor.
              </div>
            ) : (
              <div className="contracts-table-viewport">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E9F0', color: '#667085', fontWeight: 600 }}>
                      <th style={{ padding: '10px 16px' }}>Software Name</th>
                      <th style={{ padding: '10px 16px' }}>Publisher</th>
                      <th style={{ padding: '10px 16px' }}>Licenses (Used / Total)</th>
                      <th style={{ padding: '10px 16px' }}>Expiry</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendor.software_licenses.map(sw => (
                      <tr key={sw.id} style={{ borderBottom: '1px solid #F5F7FA' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#172033' }}>{sw.name}</div>
                          <div style={{ fontSize: '11px', color: '#667085' }}>{sw.software_id}</div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569' }}>{sw.publisher}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {sw.used_licenses} / {sw.total_licenses}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569' }}>
                          {sw.license_expiry_date || 'Perpetual / Ongoing'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/software/${sw.id}`)}
                          >
                            View Software
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Primary Account Lead Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E5E9F0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UserCheck size={18} />
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#172033', margin: 0 }}>
                Primary Account Manager
              </h3>
            </div>

            {vendor.primary_contact_name ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontWeight: 600, fontSize: '15px', color: '#172033' }}>
                  {vendor.primary_contact_name}
                </div>

                {vendor.primary_contact_email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <Mail size={14} style={{ color: '#667085' }} />
                    <a
                      href={`mailto:${vendor.primary_contact_email}`}
                      style={{ color: '#2563EB', textDecoration: 'none' }}
                    >
                      {vendor.primary_contact_email}
                    </a>
                  </div>
                )}

                {vendor.primary_contact_phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <Phone size={14} style={{ color: '#667085' }} />
                    <a
                      href={`tel:${vendor.primary_contact_phone}`}
                      style={{ color: '#172033', textDecoration: 'none' }}
                    >
                      {vendor.primary_contact_phone}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: '#98A2B3' }}>
                No primary contact specified yet.
              </div>
            )}
          </div>

          {/* Quick Metrics Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E5E9F0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#172033', marginBottom: '14px' }}>
              Vendor Engagement Summary
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: '#667085' }}>Active Contracts</span>
                <span style={{ fontWeight: 600, color: '#172033' }}>{vendor.active_contracts_count}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: '#667085' }}>Hardware Assets Supplied</span>
                <span style={{ fontWeight: 600, color: '#172033' }}>{vendor.assets_count}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: '#667085' }}>Software & SaaS Provisioned</span>
                <span style={{ fontWeight: 600, color: '#172033' }}>{vendor.software_count}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: '#667085' }}>Account Created</span>
                <span style={{ color: '#475467' }}>{new Date(vendor.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Activity & History Log */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E5E9F0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Clock size={16} style={{ color: '#667085' }} />
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#172033', margin: 0 }}>
                Activity & Audit History
              </h3>
            </div>

            {vendor.history.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#98A2B3' }}>No recorded activity.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {vendor.history.slice(0, 10).map((h, i) => (
                  <div key={i} style={{ borderLeft: '2px solid #E5E9F0', paddingLeft: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#172033' }}>{h.action}</div>
                    <div style={{ fontSize: '11px', color: '#667085', marginTop: '2px' }}>
                      {h.actor_name || 'System'} • {new Date(h.timestamp).toLocaleDateString()}
                    </div>
                    {h.details && (
                      <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                        {h.details}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <EditVendorModal
        isOpen={isEditVendorOpen}
        vendor={vendor}
        onClose={() => setIsEditVendorOpen(false)}
        onSuccess={() => loadVendor()}
      />

      <AddContactModal
        isOpen={isAddContactOpen}
        vendorId={vendor.id}
        vendorName={vendor.name}
        onClose={() => setIsAddContactOpen(false)}
        onSuccess={() => loadVendor()}
      />

      <AddContractModal
        isOpen={isAddContractOpen}
        preselectedVendorId={vendor.id}
        preselectedVendorName={vendor.name}
        onClose={() => setIsAddContractOpen(false)}
        onSuccess={() => loadVendor()}
      />

      <EditContractModal
        isOpen={!!editingContract}
        contract={editingContract}
        onClose={() => setEditingContract(null)}
        onSuccess={() => loadVendor()}
      />
    </div>
  );
};
