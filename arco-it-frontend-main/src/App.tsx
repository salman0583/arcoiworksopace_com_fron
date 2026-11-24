import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { EmployeeList } from './pages/employees/EmployeeList';
import { EmployeeDetail } from './pages/employees/EmployeeDetail';
import { AuditLogList } from './pages/audit/AuditLogList';
import { LoadingSpinner } from './components/ui';
import { CreateTicket } from './pages/tickets/CreateTicket';
import { TicketList } from './pages/tickets/TicketList';
import { MyTickets } from './pages/tickets/MyTickets';
import { TicketDetail } from './pages/tickets/TicketDetail';
import { AssetList } from './pages/assets/AssetList';
import { AssetDetail } from './pages/assets/AssetDetail';
import { MyAssets } from './pages/assets/MyAssets';
import { AssetReports } from './pages/assets/AssetReports';
import { SoftwareList } from './pages/software/SoftwareList';

import { SoftwareDetail } from './pages/software/SoftwareDetail';
import { MySoftware } from './pages/software/MySoftware';
import { VendorList } from './pages/vendors/VendorList';
import { VendorDetail } from './pages/vendors/VendorDetail';
import { ProcurementList } from './pages/procurement/ProcurementList';
import { ProcurementDetail } from './pages/procurement/ProcurementDetail';
import { QuotationComparisonPage } from './pages/procurement/QuotationComparisonPage';
import { ServiceRequestList } from './pages/service-requests/ServiceRequestList';
import { ServiceRequestDetail } from './pages/service-requests/ServiceRequestDetail';
import { RewardProgramList } from './pages/rewards/RewardProgramList';
import { RewardProgramDetail } from './pages/rewards/RewardProgramDetail';
import { RewardReports } from './pages/rewards/RewardReports';
import { MyRewards } from './pages/rewards/MyRewards';
import { ServiceDeskList } from './pages/service-desk/ServiceDeskList';
import { ExpenseList } from './pages/expenses/ExpenseList';
import { Profile } from './pages/Profile';
import { ErrorBoundary } from './components/ErrorBoundary';








import {
  isITStaff,
  canAccessPurchasing,
  canAccessOfficeExpenses,
  canAccessAuditLogs,
  canViewRewardsAdmin,
  canViewAllEmployees,
} from './utils/auth';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function PurchasingRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user || !canAccessPurchasing(user.role)) return <Navigate to="/dashboard" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function OfficeExpensesRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user || !canAccessOfficeExpenses(user.role)) return <Navigate to="/dashboard" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function AuditLogsRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user || !canAccessAuditLogs(user.role)) return <Navigate to="/dashboard" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function ITOperationsRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user || !isITStaff(user.role)) return <Navigate to="/dashboard" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function RewardsAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user || !canViewRewardsAdmin(user.role)) return <Navigate to="/dashboard" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function EmployeesRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user || !canViewAllEmployees(user.role)) return <Navigate to="/dashboard" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <AuthLayout>{children}</AuthLayout>;
}

const TicketsRouter: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;
  return isITStaff(user.role) ? <TicketList /> : <MyTickets />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/my-profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      
      {/* Employee Directory — Restricted to HR and IT Staff */}
      <Route path="/employees" element={<EmployeesRoute><EmployeeList /></EmployeesRoute>} />
      <Route path="/employees/:id" element={<EmployeesRoute><EmployeeDetail /></EmployeesRoute>} />

      {/* IT Service Desk routes — Consolidated Incidents & Service Requests */}
      <Route path="/service-desk" element={<ProtectedRoute><ServiceDeskList /></ProtectedRoute>} />
      <Route path="/tickets" element={<ProtectedRoute><ServiceDeskList /></ProtectedRoute>} />
      <Route path="/service-requests" element={<ProtectedRoute><ServiceDeskList /></ProtectedRoute>} />
      <Route path="/tickets/create" element={<ProtectedRoute><CreateTicket /></ProtectedRoute>} />
      <Route path="/tickets/:id" element={<ProtectedRoute><TicketDetail /></ProtectedRoute>} />

      {/* Asset Management routes */}
      <Route path="/assets" element={<ITOperationsRoute><AssetList /></ITOperationsRoute>} />
      <Route path="/assets/reports" element={<ITOperationsRoute><AssetReports /></ITOperationsRoute>} />
      <Route path="/assets/:id" element={<ProtectedRoute><AssetDetail /></ProtectedRoute>} />
      <Route path="/my-assets" element={<ProtectedRoute><MyAssets /></ProtectedRoute>} />

      {/* Software & Licenses routes */}
      <Route path="/software" element={<ITOperationsRoute><SoftwareList /></ITOperationsRoute>} />
      <Route path="/software/:id" element={<ITOperationsRoute><SoftwareDetail /></ITOperationsRoute>} />
      <Route path="/my-software" element={<ProtectedRoute><MySoftware /></ProtectedRoute>} />

      {/* Vendor Management routes — Restricted to IT Staff */}
      <Route path="/vendors" element={<ITOperationsRoute><VendorList /></ITOperationsRoute>} />
      <Route path="/vendors/:id" element={<ITOperationsRoute><VendorDetail /></ITOperationsRoute>} />

      {/* Purchasing routes — Restricted to IT Admin & Super Admin */}
      <Route path="/procurement" element={<PurchasingRoute><ProcurementList /></PurchasingRoute>} />
      <Route path="/procurement/quotation-comparison" element={<PurchasingRoute><QuotationComparisonPage /></PurchasingRoute>} />
      <Route path="/procurement/:id" element={<PurchasingRoute><ProcurementDetail /></PurchasingRoute>} />

      {/* Office Expenses & Reimbursements routes */}
      <Route path="/expenses" element={<ProtectedRoute><ExpenseList /></ProtectedRoute>} />
      <Route path="/office-expenses" element={<ProtectedRoute><ExpenseList /></ProtectedRoute>} />
      <Route path="/reimbursements" element={<ProtectedRoute><ExpenseList /></ProtectedRoute>} />


      {/* Service Request Detail fallback route */}
      <Route path="/service-requests/:id" element={<ProtectedRoute><ServiceRequestDetail /></ProtectedRoute>} />

      {/* Rewards & Recognition routes — HR, IT Admin & Super Admin */}
      <Route path="/rewards" element={<RewardsAdminRoute><RewardProgramList /></RewardsAdminRoute>} />
      <Route path="/rewards/reports" element={<RewardsAdminRoute><RewardReports /></RewardsAdminRoute>} />
      <Route path="/rewards/:id" element={<RewardsAdminRoute><RewardProgramDetail /></RewardsAdminRoute>} />
      <Route path="/my-rewards" element={<ProtectedRoute><MyRewards /></ProtectedRoute>} />

      {/* Audit Logs — Restricted to IT Admin & Super Admin */}
      <Route path="/audit" element={<AuditLogsRoute><AuditLogList /></AuditLogsRoute>} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
