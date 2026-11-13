import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  LayoutGrid,
  Link2,
  LogOut,
  Search,
  Table as TableIcon,
  UserPlus,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PolicyCategory, PolicyRecord } from '../../types/adharafinx';
import {
  AGENT_MONTHLY_SUBSCRIPTION,
  AGENT_SMS_PACKAGE_FEE,
  calculateContribution,
  formatDate,
  formatINR,
} from '../../utils/finance';
import { BrandMark } from '../common/BrandMark';
import { PaymentCalendar } from '../common/PaymentCalendar';

interface AgentPortalProps {
  onOpenOnboardingLink: (token: string) => void;
}

type AgentTab = 'overview' | 'customers' | 'onboarding' | 'subscription';

export const AgentPortal: React.FC<AgentPortalProps> = ({ onOpenOnboardingLink }) => {
  const {
    state,
    currentUser,
    currentAgentProfile,
    logout,
    agentCreateCustomer,
    toggleAgentSmsPackage,
    activateAgentSubscription,
  } = useApp();

  const [activeTab, setActiveTab] = useState<AgentTab>('overview');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [inspectedCustomer, setInspectedCustomer] = useState<PolicyRecord | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // New Customer Onboarding Link Form State
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [insuranceCompany, setInsuranceCompany] = useState('Star Health and Allied Insurance');
  const [policyName, setPolicyName] = useState('Family Health Optima');
  const [policyNumber, setPolicyNumber] = useState('');
  const [category, setCategory] = useState<PolicyCategory>('Health');
  const [annualPremium, setAnnualPremium] = useState(30000);
  const [startDate, setStartDate] = useState('2026-11-20');
  const [annualDueDate, setAnnualDueDate] = useState('2027-11-20');
  const [expiryDate, setExpiryDate] = useState('2027-11-19');
  const [nomineeDetails, setNomineeDetails] = useState('');
  const [generatedInvite, setGeneratedInvite] = useState<{
    token: string;
    customerName: string;
  } | null>(null);

  // Strict data isolation: Agent ONLY sees policies assigned to their own agentId
  const assignedPolicies = useMemo(() => {
    if (!currentAgentProfile) return [];
    return state.policies.filter((p) => p.agentId === currentAgentProfile.id);
  }, [state.policies, currentAgentProfile]);

  const metrics = useMemo(() => {
    const totalEnrolled = assignedPolicies.length;
    const activeCustomers = assignedPolicies.filter((p) => p.onboardingStatus === 'Active').length;
    const pendingOnboarding = assignedPolicies.filter(
      (p) => p.onboardingStatus === 'Pending Onboarding'
    ).length;
    const activeMandates = assignedPolicies.filter((p) => p.mandateStatus === 'Active').length;
    const failedPayments = assignedPolicies.reduce((sum, p) => sum + p.missedMonths, 0);
    const upcomingRenewals = assignedPolicies.filter(
      (p) => p.settlementStatus === 'Settlement Pending' || p.paidMonths >= 10
    ).length;
    const totalAnnualValue = assignedPolicies.reduce((sum, p) => sum + p.annualPremium, 0);
    const monthlyContributionVolume = assignedPolicies.reduce(
      (sum, p) => sum + calculateContribution(p.annualPremium).totalMonthly,
      0
    );

    return {
      totalEnrolled,
      activeCustomers,
      pendingOnboarding,
      activeMandates,
      failedPayments,
      upcomingRenewals,
      totalAnnualValue,
      monthlyContributionVolume,
    };
  }, [assignedPolicies]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return assignedPolicies.filter((p) => {
      const matchesSearch =
        !q ||
        p.customerName.toLowerCase().includes(q) ||
        p.policyNumber.toLowerCase().includes(q) ||
        p.insuranceCompany.toLowerCase().includes(q) ||
        p.policyName.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'ALL' ||
        p.onboardingStatus === statusFilter ||
        p.mandateStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [assignedPolicies, searchQuery, statusFilter]);

  const handleCopyToken = (token: string) => {
    const url = `${window.location.origin}${window.location.pathname}?onboard=${token}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleCreateOnboarding = (e: React.FormEvent) => {
    e.preventDefault();
    const res = agentCreateCustomer({
      customerName,
      customerEmail,
      customerMobile,
      insuranceCompany,
      policyName,
      policyNumber: policyNumber || `AFX-POL-${Math.floor(1000 + Math.random() * 9000)}`,
      category,
      annualPremium,
      startDate,
      annualDueDate,
      expiryDate,
      policyholderName: customerName,
      nomineeDetails,
    });

    if (res) {
      setGeneratedInvite({ token: res.onboardingToken, customerName });
      setCustomerName('');
      setCustomerEmail('');
      setCustomerMobile('');
      setPolicyNumber('');
      setNomineeDetails('');
    }
  };

  if (!currentAgentProfile) return null;

  const navItems: Array<{ id: AgentTab; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'overview', label: 'Agent Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customer Book', icon: Users },
    { id: 'onboarding', label: 'Onboarding Links', icon: UserPlus },
    { id: 'subscription', label: 'Plan & SMS (₹699)', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white flex flex-col justify-between">
        <div>
          <div className="border-b border-slate-200 px-5 py-4">
            <BrandMark variant="wordmark" />
            <p className="mt-1 text-[11px] font-medium text-teal-700">Insurance Agent Portal</p>
          </div>

          <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setInspectedCustomer(null);
                  }}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#0A2540] text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="hidden lg:block border-t border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-900 truncate">
            {currentAgentProfile.fullName}
          </p>
          <p className="text-[11px] text-slate-500 truncate">{currentAgentProfile.agencyName}</p>
          <p className="mt-1 font-mono text-[10px] text-slate-500 truncate">
            {currentAgentProfile.licenseNumber}
          </p>
          <button
            type="button"
            onClick={logout}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="border-b border-slate-200 bg-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            {currentAgentProfile.agencyName} /{' '}
            <span className="font-semibold text-[#0A2540]">
              {navItems.find((n) => n.id === activeTab)?.label}
            </span>
          </p>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600">
              Subscription:{' '}
              <strong
                className={
                  currentAgentProfile.subscriptionStatus === 'Active'
                    ? 'text-emerald-700'
                    : 'text-amber-700'
                }
              >
                {currentAgentProfile.subscriptionStatus}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('onboarding')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 whitespace-nowrap shrink-0"
            >
              <UserPlus className="h-3.5 w-3.5" />
              New Customer Link
            </button>
            <button
              type="button"
              onClick={logout}
              className="lg:hidden rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              Sign Out
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500">
                    {currentAgentProfile.location} · Licence {currentAgentProfile.licenseNumber}
                  </p>
                  <h1 className="mt-1 font-display text-2xl font-bold text-[#0A2540]">
                    Welcome, {currentUser?.name}
                  </h1>
                  <p className="mt-1 text-xs text-slate-600">
                    Representing: {currentAgentProfile.companiesRepresented.join(', ')} ·
                    Role-isolated view showing only customers assigned to your agency.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('customers')}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Open Full Customer Book
                </button>
              </div>

              {/* 8 Agent KPIs */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Total Enrolled Customers</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-[#0A2540] tabular-nums">
                    {metrics.totalEnrolled}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Active Customers</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
                    {metrics.activeCustomers}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Pending Onboarding</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-amber-700 tabular-nums">
                    {metrics.pendingOnboarding}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Active Mandates</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-teal-700 tabular-nums">
                    {metrics.activeMandates}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Failed Payments (Count)</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-red-700 tabular-nums">
                    {metrics.failedPayments}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Upcoming Renewals / Settlements</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-[#0A2540] tabular-nums">
                    {metrics.upcomingRenewals}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Total Annual Premium Managed</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-[#0A2540] tabular-nums">
                    {formatINR(metrics.totalAnnualValue, false)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Monthly Contribution Volume</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-teal-700 tabular-nums">
                    {formatINR(metrics.monthlyContributionVolume)}
                  </p>
                </div>
              </div>

              {/* Actionable Book Summary */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="font-display text-base font-bold text-[#0A2540]">
                  Assigned Customers Requiring Attention
                </h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2 font-semibold">Customer</th>
                        <th className="py-2 font-semibold">Policy</th>
                        <th className="py-2 font-semibold">Status</th>
                        <th className="py-2 text-right font-semibold">Annual Premium</th>
                        <th className="py-2 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {assignedPolicies.map((pol) => (
                        <tr key={pol.id}>
                          <td className="py-2.5 font-semibold text-slate-900">
                            {pol.customerName}
                          </td>
                          <td className="py-2.5 text-slate-600">
                            {pol.policyName} ·{' '}
                            <span className="font-mono">{pol.policyNumber}</span>
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`font-semibold ${
                                pol.consecutiveMissedMonths > 0
                                  ? 'text-red-700'
                                  : pol.onboardingStatus === 'Pending Onboarding'
                                    ? 'text-amber-700'
                                    : 'text-emerald-700'
                              }`}
                            >
                              {pol.consecutiveMissedMonths > 0
                                ? `${pol.consecutiveMissedMonths} Missed Payment(s)`
                                : pol.onboardingStatus}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-mono tabular-nums text-slate-900">
                            {formatINR(pol.annualPremium, false)}
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setInspectedCustomer(pol);
                                setActiveTab('customers');
                              }}
                              className="font-semibold text-teal-700 hover:underline"
                            >
                              Inspect Dashboard
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* CUSTOMERS TAB (Table + Card Switcher + Customer Detail Inspector) */}
          {activeTab === 'customers' && (
            <>
              {inspectedCustomer ? (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <button
                        type="button"
                        onClick={() => setInspectedCustomer(null)}
                        className="text-xs font-semibold text-teal-700 hover:underline"
                      >
                        ← Back to Assigned Customer Book
                      </button>
                      <h2 className="mt-1 font-display text-2xl font-bold text-[#0A2540]">
                        {inspectedCustomer.customerName} · {inspectedCustomer.policyNumber}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {inspectedCustomer.insuranceCompany} · {inspectedCustomer.policyName} (
                        {inspectedCustomer.category})
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs text-slate-500">Annual Premium</p>
                      <p className="mt-1 font-mono text-lg font-bold text-[#0A2540] tabular-nums">
                        {formatINR(inspectedCustomer.annualPremium, false)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs text-slate-500">Accumulated Base</p>
                      <p className="mt-1 font-mono text-lg font-bold text-emerald-700 tabular-nums">
                        {formatINR(inspectedCustomer.accumulatedBaseContribution, false)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs text-slate-500">Mandate Status</p>
                      <p className="mt-1 font-display text-base font-bold text-[#0A2540]">
                        {inspectedCustomer.mandateStatus}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs text-slate-500">Paid / Pending / Missed</p>
                      <p className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums">
                        {inspectedCustomer.paidMonths} / {inspectedCustomer.pendingMonths} /{' '}
                        {inspectedCustomer.missedMonths}
                      </p>
                    </div>
                  </div>

                  <PaymentCalendar
                    entries={inspectedCustomer.calendarEntries}
                    policyNumber={inspectedCustomer.policyNumber}
                    annualDueDate={formatDate(inspectedCustomer.annualDueDate)}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3 flex-1">
                      <div className="relative flex-1 min-w-[220px] max-w-sm">
                        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search customer, policy number, insurer..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs focus:border-teal-600 focus:outline-none"
                        />
                      </div>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Pending Onboarding">Pending Onboarding</option>
                        <option value="Action Required">Action Required</option>
                        <option value="Paused">Mandate Paused</option>
                        <option value="Cancelled">Mandate Cancelled</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                      <button
                        type="button"
                        onClick={() => setViewMode('table')}
                        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
                          viewMode === 'table'
                            ? 'bg-white text-[#0A2540] shadow-xs'
                            : 'text-slate-600'
                        }`}
                      >
                        <TableIcon className="h-3.5 w-3.5" />
                        Table
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('cards')}
                        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
                          viewMode === 'cards'
                            ? 'bg-white text-[#0A2540] shadow-xs'
                            : 'text-slate-600'
                        }`}
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        Cards
                      </button>
                    </div>
                  </div>

                  {viewMode === 'table' ? (
                    <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                            <th className="px-4 py-3 font-semibold">Customer</th>
                            <th className="px-4 py-3 font-semibold">Policy Number</th>
                            <th className="px-4 py-3 font-semibold">Insurer & Plan</th>
                            <th className="px-4 py-3 text-right font-semibold">Annual</th>
                            <th className="px-4 py-3 text-right font-semibold">Monthly</th>
                            <th className="px-4 py-3 text-right font-semibold">Accumulated</th>
                            <th className="px-4 py-3 text-center font-semibold">Paid / Pend</th>
                            <th className="px-4 py-3 font-semibold">Mandate</th>
                            <th className="px-4 py-3 font-semibold">Next Debit</th>
                            <th className="px-4 py-3 font-semibold">Renewal</th>
                            <th className="px-4 py-3 text-right font-semibold">Inspect</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredCustomers.map((pol) => {
                            const c = calculateContribution(pol.annualPremium);
                            return (
                              <tr key={pol.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                                  {pol.customerName}
                                </td>
                                <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                                  {pol.policyNumber}
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-medium text-slate-900">{pol.policyName}</p>
                                  <p className="text-[11px] text-slate-500">
                                    {pol.insuranceCompany}
                                  </p>
                                </td>
                                <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                                  {formatINR(pol.annualPremium, false)}
                                </td>
                                <td className="px-4 py-3 text-right font-mono tabular-nums text-teal-700 font-semibold">
                                  {formatINR(c.totalMonthly)}
                                </td>
                                <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-700">
                                  {formatINR(pol.accumulatedBaseContribution, false)}
                                </td>
                                <td className="px-4 py-3 text-center font-mono tabular-nums">
                                  {pol.paidMonths} / {pol.pendingMonths}
                                </td>
                                <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                                  {pol.mandateStatus}
                                </td>
                                <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                                  {formatDate(pol.nextDebitDate)}
                                </td>
                                <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                                  {formatDate(pol.annualDueDate)}
                                </td>
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => setInspectedCustomer(pol)}
                                    className="font-semibold text-teal-700 hover:underline"
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {filteredCustomers.map((pol) => {
                        const c = calculateContribution(pol.annualPremium);
                        return (
                          <div
                            key={pol.id}
                            className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h3 className="font-display text-base font-bold text-[#0A2540]">
                                    {pol.customerName}
                                  </h3>
                                  <p className="font-mono text-xs text-slate-500">
                                    {pol.policyNumber}
                                  </p>
                                </div>
                                <span className="text-xs font-semibold text-teal-700">
                                  {pol.mandateStatus}
                                </span>
                              </div>
                              <p className="mt-2 text-xs text-slate-700">
                                {pol.insuranceCompany} · {pol.policyName}
                              </p>

                              <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-3 text-xs">
                                <div>
                                  <span className="text-slate-500">Annual</span>
                                  <p className="font-mono font-semibold text-slate-900 tabular-nums">
                                    {formatINR(pol.annualPremium, false)}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-slate-500">Monthly</span>
                                  <p className="font-mono font-semibold text-teal-700 tabular-nums">
                                    {formatINR(c.totalMonthly)}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-slate-500">Accumulated</span>
                                  <p className="font-mono font-semibold text-emerald-700 tabular-nums">
                                    {formatINR(pol.accumulatedBaseContribution, false)}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-slate-500">Paid / Pending</span>
                                  <p className="font-mono font-semibold text-slate-900 tabular-nums">
                                    {pol.paidMonths} / {pol.pendingMonths}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-slate-500">Next Debit</span>
                                  <p className="font-mono text-slate-800">
                                    {formatDate(pol.nextDebitDate)}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-slate-500">Renewal Date</span>
                                  <p className="font-mono text-slate-800">
                                    {formatDate(pol.annualDueDate)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setInspectedCustomer(pol)}
                              className="mt-4 w-full rounded-lg border border-[#0A2540] py-2 text-xs font-semibold text-[#0A2540] hover:bg-[#0A2540] hover:text-white transition-colors"
                            >
                              Open Customer Dashboard
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ONBOARDING LINKS TAB */}
          {activeTab === 'onboarding' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <form
                onSubmit={handleCreateOnboarding}
                className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 space-y-4"
              >
                <div>
                  <h2 className="font-display text-lg font-bold text-[#0A2540]">
                    Create Customer Profile & Unique Onboarding Link
                  </h2>
                  <p className="text-xs text-slate-500">
                    Share the generated link so the customer can register, confirm policy details,
                    and activate their simulated eNACH mandate.
                  </p>
                </div>

                {generatedInvite && (
                  <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs space-y-2">
                    <p className="font-bold text-emerald-900">
                      Unique Onboarding Link Generated for {generatedInvite.customerName}
                    </p>
                    <p className="font-mono text-emerald-800 break-all">
                      {window.location.origin}
                      {window.location.pathname}?onboard={generatedInvite.token}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleCopyToken(generatedInvite.token)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-white border border-emerald-300 px-3 py-1.5 font-semibold text-emerald-900"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copiedToken === generatedInvite.token ? 'Copied Link' : 'Copy Link'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenOnboardingLink(generatedInvite.token)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-[#0A2540] px-3 py-1.5 font-semibold text-white"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open Customer Onboarding Flow (Preview)
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Customer Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Deepak Verma"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Customer Email</label>
                    <input
                      type="email"
                      required
                      placeholder="deepak@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Mobile Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98100 22334"
                      value={customerMobile}
                      onChange={(e) => setCustomerMobile(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Policy Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as PolicyCategory)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="Health">Health</option>
                      <option value="Life">Life</option>
                      <option value="Term">Term</option>
                      <option value="Vehicle">Vehicle</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">
                      Insurance Company
                    </label>
                    <input
                      type="text"
                      required
                      value={insuranceCompany}
                      onChange={(e) => setInsuranceCompany(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Policy Name</label>
                    <input
                      type="text"
                      required
                      value={policyName}
                      onChange={(e) => setPolicyName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Policy Number</label>
                    <input
                      type="text"
                      placeholder="Auto-generated if blank"
                      value={policyNumber}
                      onChange={(e) => setPolicyNumber(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">
                      Annual Premium (₹)
                    </label>
                    <input
                      type="number"
                      required
                      min={1200}
                      value={annualPremium}
                      onChange={(e) => setAnnualPremium(Math.max(1200, Number(e.target.value)))}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Start Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Annual Due Date</label>
                    <input
                      type="date"
                      required
                      value={annualDueDate}
                      onChange={(e) => setAnnualDueDate(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700">
                      Nominee Details (Optional)
                    </label>
                    <input
                      type="text"
                      value={nomineeDetails}
                      onChange={(e) => setNomineeDetails(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-lg bg-teal-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-teal-700"
                >
                  Generate Unique Customer Onboarding Link
                </button>
              </form>

              <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="font-display text-base font-bold text-[#0A2540]">
                  Issued Onboarding Invites
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Track customer registration status and test any pending link.
                </p>

                <div className="mt-4 space-y-3">
                  {assignedPolicies
                    .filter((p) => p.onboardingToken)
                    .map((pol) => (
                      <div
                        key={pol.id}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">{pol.customerName}</span>
                          <span
                            className={`font-semibold ${
                              pol.onboardingStatus === 'Active'
                                ? 'text-emerald-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {pol.onboardingStatus}
                          </span>
                        </div>
                        <p className="font-mono text-[11px] text-slate-600">
                          Token: {pol.onboardingToken} · {formatINR(pol.annualPremium, false)}
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleCopyToken(pol.onboardingToken!)}
                            className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-700"
                          >
                            {copiedToken === pol.onboardingToken ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Link2 className="h-3 w-3" />
                            )}
                            {copiedToken === pol.onboardingToken ? 'Copied' : 'Copy Link'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenOnboardingLink(pol.onboardingToken!)}
                            className="inline-flex items-center gap-1 rounded bg-[#0A2540] px-2.5 py-1 font-semibold text-white"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Simulate Customer Open
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* SUBSCRIPTION TAB */}
          {activeTab === 'subscription' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <p className="text-xs font-semibold text-teal-700">
                      Agency SaaS Plan & SMS Notifications
                    </p>
                    <h2 className="mt-1 font-display text-xl font-bold text-[#0A2540]">
                      {currentAgentProfile.agencyName} Subscription
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Status</p>
                    <p className="font-display text-lg font-bold text-[#0A2540]">
                      {currentAgentProfile.subscriptionStatus}
                    </p>
                    <p className="text-xs text-slate-500">
                      Renewal: {formatDate(currentAgentProfile.renewalDate)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold text-slate-500">Base Agent Subscription</p>
                    <p className="mt-1 font-mono text-2xl font-bold text-[#0A2540] tabular-nums">
                      {formatINR(AGENT_MONTHLY_SUBSCRIPTION, false)} / month
                    </p>
                    <p className="mt-2 text-xs text-slate-600">
                      Includes unlimited customer onboarding links, policy tracking, and renewal
                      analytics.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-500">
                          Optional SMS Reminder Package
                        </p>
                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={currentAgentProfile.smsPackageEnabled}
                            onChange={(e) =>
                              toggleAgentSmsPackage(currentAgentProfile.id, e.target.checked)
                            }
                            className="h-4 w-4 accent-teal-600"
                          />
                          {currentAgentProfile.smsPackageEnabled ? 'Enabled' : 'Disabled'}
                        </label>
                      </div>
                      <p className="mt-1 font-mono text-2xl font-bold text-teal-700 tabular-nums">
                        {formatINR(AGENT_SMS_PACKAGE_FEE, false)} / month
                      </p>
                      <p className="mt-2 text-xs text-slate-600">
                        Automated SMS reminders for customer mandate debits and missed-payment
                        notices.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
                  <p className="text-xs text-slate-600">
                    Total Monthly SaaS Charge:{' '}
                    <strong className="font-mono text-sm text-[#0A2540]">
                      {formatINR(
                        AGENT_MONTHLY_SUBSCRIPTION +
                          (currentAgentProfile.smsPackageEnabled ? AGENT_SMS_PACKAGE_FEE : 0),
                        false
                      )}
                    </strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => activateAgentSubscription(currentAgentProfile.id)}
                    className="rounded-lg bg-[#0A2540] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#13365a]"
                  >
                    Simulate Subscription Activation / Renewal (DEMO)
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="font-display text-base font-bold text-[#0A2540]">
                  Subscription Billing History (DEMO)
                </h3>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2 font-semibold">Invoice Date</th>
                        <th className="py-2 font-semibold">Period</th>
                        <th className="py-2 text-right font-semibold">Base Plan</th>
                        <th className="py-2 text-right font-semibold">SMS Add-On</th>
                        <th className="py-2 text-right font-semibold">Total</th>
                        <th className="py-2 text-right font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentAgentProfile.subscriptionHistory.map((inv) => (
                        <tr key={inv.id}>
                          <td className="py-2.5 font-mono text-slate-700">{formatDate(inv.date)}</td>
                          <td className="py-2.5 font-semibold text-slate-900">{inv.periodLabel}</td>
                          <td className="py-2.5 text-right font-mono tabular-nums">
                            {formatINR(inv.basePlanAmount, false)}
                          </td>
                          <td className="py-2.5 text-right font-mono tabular-nums">
                            {formatINR(inv.smsAddonAmount, false)}
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold tabular-nums text-[#0A2540]">
                            {formatINR(inv.totalAmount, false)}
                          </td>
                          <td className="py-2.5 text-right font-semibold text-emerald-700">
                            {inv.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
