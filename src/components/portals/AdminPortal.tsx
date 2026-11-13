import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  MessageSquareWarning,
  Printer,
  ShieldCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LedgerTransaction, PolicyRecord, SupportRequest } from '../../types/adharafinx';
import {
  AGENT_MONTHLY_SUBSCRIPTION,
  AGENT_SMS_PACKAGE_FEE,
  calculateContribution,
  downloadCSV,
  formatDate,
  formatINR,
  round2,
} from '../../utils/finance';
import { BrandMark } from '../common/BrandMark';
import { PaymentCalendar } from '../common/PaymentCalendar';
import { ReceiptModal } from '../common/ReceiptModal';

type AdminTab =
  | 'overview'
  | 'analytics'
  | 'settlements'
  | 'agents'
  | 'customers'
  | 'support';

export const AdminPortal: React.FC = () => {
  const {
    state,
    currentUser,
    logout,
    adminProcessSettlement,
    adminUpdateSupportRequest,
    adminUpdateAgentStatus,
    toggleAgentSmsPackage,
  } = useApp();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [selectedCustomerForCalendar, setSelectedCustomerForCalendar] =
    useState<PolicyRecord | null>(null);
  const [receiptTx, setReceiptTx] = useState<LedgerTransaction | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [supportNoteDrafts, setSupportNoteDrafts] = useState<Record<string, string>>({});

  // Grounded platform & strictly separated financial calculations
  const metrics = useMemo(() => {
    const individualUsers = state.users.filter((u) => u.role === 'individual');
    const totalIndividuals = individualUsers.length;
    const totalAgents = state.agents.length;
    const activeAgents = state.agents.filter((a) => a.subscriptionStatus === 'Active').length;
    const totalPolicies = state.policies.length;

    // Customer Premium Principal (NEVER counted as AdharaFinx revenue)
    const totalAnnualPremiumManaged = state.policies.reduce((s, p) => s + p.annualPremium, 0);
    const averageAnnualPremium =
      totalPolicies > 0 ? round2(totalAnnualPremiumManaged / totalPolicies) : 0;

    const totalMonthlyContributionsTracked = state.policies.reduce(
      (s, p) => s + calculateContribution(p.annualPremium).totalMonthly,
      0
    );

    const paidMonthlyTxs = state.transactions.filter(
      (t) => t.type === 'Monthly Contribution' && t.status === 'Paid'
    );
    const failedTxs = state.transactions.filter((t) => t.status === 'Failed');
    const attemptedContributionTxs = state.transactions.filter(
      (t) => t.type === 'Monthly Contribution' && (t.status === 'Paid' || t.status === 'Failed')
    );

    const failedPaymentRate =
      attemptedContributionTxs.length > 0
        ? round2((failedTxs.length / attemptedContributionTxs.length) * 100)
        : 0;

    // Contribution Principal & Pass-Through Gateway Fees (Excluded from Revenue)
    const totalBasePrincipalCollected = round2(
      paidMonthlyTxs.reduce((s, t) => s + t.baseAmount, 0)
    );
    const totalGatewayPassThrough = round2(
      paidMonthlyTxs.reduce((s, t) => s + t.gatewayFee, 0)
    );

    // Revenue Stream 1: 1.5% Platform Fees
    const monthlyPlatformFeeRunRate = round2(
      state.policies.reduce((s, p) => s + calculateContribution(p.annualPremium).platformFee, 0)
    );
    const historicalPlatformFeeRevenue = round2(
      paidMonthlyTxs.reduce((s, t) => s + t.platformFee, 0)
    );

    // Revenue Stream 2: Agent Subscriptions (₹699/mo per active agent)
    const monthlyAgentSubRevenue = activeAgents * AGENT_MONTHLY_SUBSCRIPTION;

    // Revenue Stream 3: Optional SMS Subscriptions (₹49/mo per active SMS-enabled agent)
    const activeSmsAgents = state.agents.filter(
      (a) => a.subscriptionStatus === 'Active' && a.smsPackageEnabled
    ).length;
    const monthlySmsRevenue = activeSmsAgents * AGENT_SMS_PACKAGE_FEE;

    const totalMonthlyRevenue = round2(
      monthlyPlatformFeeRunRate + monthlyAgentSubRevenue + monthlySmsRevenue
    );
    const annualizedRevenue = round2(totalMonthlyRevenue * 12);

    const pendingSettlements = state.policies.filter(
      (p) => p.settlementStatus === 'Settlement Pending'
    );
    const openSupportRequests = state.supportRequests.filter((r) => r.status !== 'Resolved');

    return {
      totalIndividuals,
      totalAgents,
      activeAgents,
      activeSmsAgents,
      totalPolicies,
      totalAnnualPremiumManaged,
      averageAnnualPremium,
      totalMonthlyContributionsTracked,
      totalBasePrincipalCollected,
      totalGatewayPassThrough,
      monthlyPlatformFeeRunRate,
      historicalPlatformFeeRevenue,
      monthlyAgentSubRevenue,
      monthlySmsRevenue,
      totalMonthlyRevenue,
      annualizedRevenue,
      pendingSettlements,
      failedTxs,
      failedPaymentRate,
      openSupportRequests,
    };
  }, [state]);

  // Monthly growth curve (2026 trajectory derived from seed + live counts)
  const growthSeries = useMemo(() => {
    const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
    const baseCustomers = [4, 5, 6, 7, 8, metrics.totalIndividuals];
    const baseAgents = [2, 2, 3, 3, 3, metrics.totalAgents];
    return months.map((m, idx) => ({
      month: m,
      customers: baseCustomers[idx],
      agents: baseAgents[idx],
    }));
  }, [metrics.totalIndividuals, metrics.totalAgents]);

  const handleExportCSV = () => {
    const rows: Array<Array<string | number>> = [
      ['AdharaFinx DEMO Financial & Revenue Separation Report', new Date().toISOString().slice(0, 10)],
      [],
      ['Section', 'Metric', 'Amount (INR)'],
      ['AdharaFinx Revenue (Monthly Run-Rate)', '1.5% Individual Platform Fees', metrics.monthlyPlatformFeeRunRate],
      ['AdharaFinx Revenue (Monthly Run-Rate)', 'Agent Subscriptions (₹699/mo)', metrics.monthlyAgentSubRevenue],
      ['AdharaFinx Revenue (Monthly Run-Rate)', 'Optional SMS Packages (₹49/mo)', metrics.monthlySmsRevenue],
      ['AdharaFinx Revenue', 'Total Monthly Revenue', metrics.totalMonthlyRevenue],
      ['AdharaFinx Revenue', 'Annualized Revenue Run-Rate (12x)', metrics.annualizedRevenue],
      ['Historical Ledger Revenue', 'Collected 1.5% Platform Fees (Paid Cycles)', metrics.historicalPlatformFeeRevenue],
      [],
      ['Non-Revenue Custodial / Pass-Through', 'Total Annual Premiums Managed (Principal)', metrics.totalAnnualPremiumManaged],
      ['Non-Revenue Custodial / Pass-Through', 'Base Contributions Collected (Principal)', metrics.totalBasePrincipalCollected],
      ['Non-Revenue Custodial / Pass-Through', '2.2% Payment Gateway Pass-Through', metrics.totalGatewayPassThrough],
    ];
    downloadCSV('AdharaFinx_DEMO_Financial_Report.csv', rows);
  };

  const navItems: Array<{ id: AdminTab; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'overview', label: 'Admin Overview', icon: LayoutDashboard },
    { id: 'analytics', label: 'Financial Analytics', icon: BarChart3 },
    { id: 'settlements', label: 'Settlements & Ledger', icon: ShieldCheck },
    { id: 'agents', label: 'Agents & Plans', icon: Building2 },
    { id: 'customers', label: 'Customers & Calendars', icon: Users },
    { id: 'support', label: 'Support & Escalations', icon: MessageSquareWarning },
  ];

  const maxRevenueBar = Math.max(
    1,
    metrics.monthlyPlatformFeeRunRate,
    metrics.monthlyAgentSubRevenue,
    metrics.monthlySmsRevenue
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-[#0A2540] text-white flex flex-col justify-between">
        <div>
          <div className="border-b border-white/10 px-5 py-4">
            <span className="font-display text-lg font-bold tracking-tight text-white">
              Adhara<span className="text-teal-400">Finx</span>
            </span>
            <p className="mt-1 text-[11px] font-medium text-slate-300">
              Platform Administration Console
            </p>
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
                    setSelectedCustomerForCalendar(null);
                  }}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-teal-600 text-white'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="hidden lg:block border-t border-white/10 p-4">
          <p className="text-xs font-semibold text-white truncate">{currentUser?.name}</p>
          <p className="text-[11px] text-slate-300 truncate">{currentUser?.email}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="border-b border-slate-200 bg-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            Admin Console /{' '}
            <span className="font-semibold text-[#0A2540]">
              {navItems.find((n) => n.id === activeTab)?.label}
            </span>
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-teal-700" />
              Generate Financial Report
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A2540] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#13365a] whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5 text-teal-400" />
              Export CSV
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
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <>
              {/* Strict Revenue Separation Disclosure */}
              <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-4 text-xs text-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <strong className="text-[#0A2540]">
                    Strict Accounting Separation Enforced:
                  </strong>{' '}
                  Customer premium principal ({formatINR(metrics.totalAnnualPremiumManaged, false)}{' '}
                  managed) and 2.2% gateway pass-through fees are strictly excluded from AdharaFinx
                  platform revenue.
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('analytics')}
                  className="font-semibold text-teal-800 underline underline-offset-4 whitespace-nowrap shrink-0"
                >
                  Open Revenue Analytics →
                </button>
              </div>

              {/* 12 Admin KPIs grouped cleanly */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Total Individuals</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-[#0A2540] tabular-nums">
                    {metrics.totalIndividuals}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Registered / Active Agents</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-[#0A2540] tabular-nums">
                    {metrics.totalAgents}{' '}
                    <span className="text-sm font-semibold text-teal-700">
                      ({metrics.activeAgents} Active)
                    </span>
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Total Policies Registered</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-[#0A2540] tabular-nums">
                    {metrics.totalPolicies}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Annual Premium Value Managed (Principal)</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                    {formatINR(metrics.totalAnnualPremiumManaged, false)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">Not AdharaFinx revenue</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Monthly Contributions Tracked</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                    {formatINR(metrics.totalMonthlyContributionsTracked)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Platform Fee Revenue (1.5% / mo)</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-teal-700 tabular-nums">
                    {formatINR(metrics.monthlyPlatformFeeRunRate)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Collected YTD: {formatINR(metrics.historicalPlatformFeeRevenue)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Agent Subscription Revenue (₹699)</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-teal-700 tabular-nums">
                    {formatINR(metrics.monthlyAgentSubRevenue, false)}
                    <span className="text-xs font-normal text-slate-500"> /mo</span>
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">SMS Subscription Revenue (₹49)</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-teal-700 tabular-nums">
                    {formatINR(metrics.monthlySmsRevenue, false)}
                    <span className="text-xs font-normal text-slate-500"> /mo</span>
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Pending Settlements</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-amber-700 tabular-nums">
                    {metrics.pendingSettlements.length}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Failed Transactions</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-red-700 tabular-nums">
                    {metrics.failedTxs.length}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Open Support Requests</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-[#0A2540] tabular-nums">
                    {metrics.openSupportRequests.length}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-[#0A2540] p-4 text-white">
                  <p className="text-xs text-slate-300">Total Monthly Platform Revenue</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-teal-400 tabular-nums">
                    {formatINR(metrics.totalMonthlyRevenue)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-300">
                    Annualized: {formatINR(metrics.annualizedRevenue, false)}
                  </p>
                </div>
              </div>

              {/* Action Queues */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-base font-bold text-[#0A2540]">
                      Pending Annual Settlement Queue
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('settlements')}
                      className="text-xs font-semibold text-teal-700 hover:underline"
                    >
                      Manage All
                    </button>
                  </div>
                  {metrics.pendingSettlements.length === 0 ? (
                    <p className="mt-4 text-xs text-slate-500">
                      No pending settlement approvals right now.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {metrics.pendingSettlements.map((pol) => (
                        <div
                          key={pol.id}
                          className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">
                              {pol.customerName} · {pol.policyNumber}
                            </p>
                            <p className="text-slate-600">
                              {pol.insuranceCompany} · Accumulated:{' '}
                              <strong className="font-mono text-slate-900">
                                {formatINR(pol.accumulatedBaseContribution)}
                              </strong>
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => adminProcessSettlement(pol.id, 'Approved')}
                              className="rounded-md bg-teal-600 px-3 py-1.5 font-semibold text-white hover:bg-teal-700"
                            >
                              Approve Settlement (DEMO)
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-base font-bold text-[#0A2540]">
                      Customer Support & Missed Payment Queue
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('support')}
                      className="text-xs font-semibold text-teal-700 hover:underline"
                    >
                      Open Queue
                    </button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {state.supportRequests.slice(0, 3).map((req) => (
                      <div
                        key={req.id}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">
                            {req.customerName} · {req.reason || req.type}
                          </span>
                          <span className="font-semibold text-teal-700">{req.status}</span>
                        </div>
                        <p className="mt-1 text-slate-600 line-clamp-2">{req.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* FINANCIAL ANALYTICS TAB */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <p className="text-xs font-semibold text-teal-700">
                      AdharaFinx Financial Analytics (Strict Revenue Isolation)
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-bold text-[#0A2540]">
                      Platform Revenue Streams vs. Custodial Principal
                    </h2>
                    <p className="mt-1 text-xs text-slate-600">
                      Platform revenue consists solely of 1.5% individual platform fees, ₹699/mo
                      agent subscriptions, and ₹49/mo SMS add-ons. The 2.2% gateway fee and customer
                      premium principal are never counted as revenue.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(true)}
                    className="rounded-lg bg-[#0A2540] px-4 py-2 text-xs font-semibold text-white hover:bg-[#13365a]"
                  >
                    View Printable Statement
                  </button>
                </div>

                {/* Top Financial Analytics KPIs */}
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Monthly Platform Revenue</p>
                    <p className="mt-1 font-mono text-2xl font-bold text-teal-700 tabular-nums">
                      {formatINR(metrics.totalMonthlyRevenue)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Annualized Revenue Run-Rate</p>
                    <p className="mt-1 font-mono text-2xl font-bold text-[#0A2540] tabular-nums">
                      {formatINR(metrics.annualizedRevenue)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Average Annual Premium Managed</p>
                    <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                      {formatINR(metrics.averageAnnualPremium, false)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Failed Payment Rate</p>
                    <p className="mt-1 font-mono text-2xl font-bold text-red-700 tabular-nums">
                      {metrics.failedPaymentRate}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Revenue by Stream + Growth Charts */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Revenue Streams Breakdown */}
                <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white p-6 space-y-5">
                  <h3 className="font-display text-base font-bold text-[#0A2540]">
                    Monthly Revenue by Stream (AdharaFinx Only)
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700">
                          1. Individual Platform Fees (1.5% of Monthly Base)
                        </span>
                        <span className="font-mono text-[#0A2540] tabular-nums">
                          {formatINR(metrics.monthlyPlatformFeeRunRate)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-3 w-full rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-teal-600"
                          style={{
                            width: `${Math.round((metrics.monthlyPlatformFeeRunRate / maxRevenueBar) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700">
                          2. Agent Subscriptions (₹699 × {metrics.activeAgents} active)
                        </span>
                        <span className="font-mono text-[#0A2540] tabular-nums">
                          {formatINR(metrics.monthlyAgentSubRevenue)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-3 w-full rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#0A2540]"
                          style={{
                            width: `${Math.round((metrics.monthlyAgentSubRevenue / maxRevenueBar) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700">
                          3. Optional SMS Packages (₹49 × {metrics.activeSmsAgents} active)
                        </span>
                        <span className="font-mono text-[#0A2540] tabular-nums">
                          {formatINR(metrics.monthlySmsRevenue)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-3 w-full rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-amber-600"
                          style={{
                            width: `${Math.max(4, Math.round((metrics.monthlySmsRevenue / maxRevenueBar) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pass-through & Principal Separation Box */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                    <p className="font-semibold text-slate-900">
                      Excluded Pass-Through & Custodial Flows
                    </p>
                    <div className="flex justify-between">
                      <span className="text-slate-600">
                        Customer Contribution Volume (Base Principal Collected)
                      </span>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        {formatINR(metrics.totalBasePrincipalCollected)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">
                        2.2% Payment Gateway Pass-Through Charges (Collected YTD)
                      </span>
                      <span className="font-mono font-semibold text-slate-700 tabular-nums">
                        {formatINR(metrics.totalGatewayPassThrough)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Active Customer & Agent Growth Chart */}
                <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="font-display text-base font-bold text-[#0A2540]">
                      Active Customer & Partner Agent Growth (2026)
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Monthly progression of enrolled policyholders and registered agencies.
                    </p>
                  </div>

                  <div className="mt-6">
                    <div className="grid grid-cols-6 gap-3 items-end h-44 border-b border-slate-200 pb-2">
                      {growthSeries.map((pt) => {
                        const custHeight = Math.round(
                          (pt.customers / Math.max(10, metrics.totalIndividuals)) * 130
                        );
                        const agtHeight = Math.round(
                          (pt.agents / Math.max(5, metrics.totalAgents)) * 130
                        );
                        return (
                          <div key={pt.month} className="flex flex-col items-center gap-1">
                            <div className="flex items-end gap-1.5 h-36">
                              <div
                                title={`Customers: ${pt.customers}`}
                                className="w-4 rounded-t bg-teal-600 transition-all"
                                style={{ height: `${custHeight}px` }}
                              />
                              <div
                                title={`Agents: ${pt.agents}`}
                                className="w-4 rounded-t bg-[#0A2540] transition-all"
                                style={{ height: `${agtHeight}px` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] font-semibold text-slate-600">
                              {pt.month}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex items-center gap-6 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-xs bg-teal-600" />
                        Policyholders ({metrics.totalIndividuals})
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-xs bg-[#0A2540]" />
                        Registered Agents ({metrics.totalAgents})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SETTLEMENTS & LEDGER TAB */}
          {activeTab === 'settlements' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="font-display text-lg font-bold text-[#0A2540]">
                  Annual Settlement Approvals (DEMO)
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  Approving a settlement generates a DEMO Settlement Acknowledgement, disburses the
                  accumulated base contribution, resets the customer wallet balance to ₹0.00, and
                  permanently preserves all historical ledger and calendar records.
                </p>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2.5 font-semibold">Policyholder</th>
                        <th className="py-2.5 font-semibold">Policy & Insurer</th>
                        <th className="py-2.5 text-right font-semibold">Annual Target</th>
                        <th className="py-2.5 text-right font-semibold">Accumulated</th>
                        <th className="py-2.5 font-semibold">Due Date</th>
                        <th className="py-2.5 font-semibold">Status</th>
                        <th className="py-2.5 text-right font-semibold">Admin Decision</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {state.policies.map((pol) => (
                        <tr key={pol.id}>
                          <td className="py-3 font-semibold text-slate-900">{pol.customerName}</td>
                          <td className="py-3">
                            <p className="font-mono text-slate-800">{pol.policyNumber}</p>
                            <p className="text-[11px] text-slate-500">{pol.insuranceCompany}</p>
                          </td>
                          <td className="py-3 text-right font-mono tabular-nums">
                            {formatINR(pol.annualPremium, false)}
                          </td>
                          <td className="py-3 text-right font-mono font-semibold tabular-nums text-emerald-700">
                            {formatINR(pol.accumulatedBaseContribution, false)}
                          </td>
                          <td className="py-3 font-mono text-slate-600">
                            {formatDate(pol.annualDueDate)}
                          </td>
                          <td className="py-3">
                            <span
                              className={`font-semibold ${
                                pol.settlementStatus === 'Settlement Pending'
                                  ? 'text-amber-700'
                                  : pol.settlementStatus === 'Settled'
                                    ? 'text-emerald-700'
                                    : pol.settlementStatus === 'Rejected'
                                      ? 'text-red-700'
                                      : 'text-slate-700'
                              }`}
                            >
                              {pol.settlementStatus}
                            </span>
                          </td>
                          <td className="py-3 text-right whitespace-nowrap">
                            {pol.accumulatedBaseContribution > 0 ? (
                              <div className="inline-flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => adminProcessSettlement(pol.id, 'Approved')}
                                  className="inline-flex items-center gap-1 rounded bg-teal-600 px-2.5 py-1 font-semibold text-white hover:bg-teal-700"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => adminProcessSettlement(pol.id, 'Rejected')}
                                  className="inline-flex items-center gap-1 rounded border border-red-300 px-2.5 py-1 font-semibold text-red-700 hover:bg-red-50"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400">
                                {pol.lastSettlementReceiptCode || 'Cycle Reset'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="font-display text-base font-bold text-[#0A2540]">
                  Simulated Payments & Settlement Ledger (Latest 15)
                </h3>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2 font-semibold">Date</th>
                        <th className="py-2 font-semibold">Receipt</th>
                        <th className="py-2 font-semibold">Type</th>
                        <th className="py-2 text-right font-semibold">Base</th>
                        <th className="py-2 text-right font-semibold">Platform (1.5%)</th>
                        <th className="py-2 text-right font-semibold">Gateway (2.2%)</th>
                        <th className="py-2 text-right font-semibold">Total</th>
                        <th className="py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {state.transactions.slice(0, 15).map((tx) => (
                        <tr key={tx.id}>
                          <td className="py-2 font-mono text-slate-700">{formatDate(tx.date)}</td>
                          <td className="py-2">
                            <button
                              type="button"
                              onClick={() => setReceiptTx(tx)}
                              className="font-mono font-semibold text-teal-700 hover:underline"
                            >
                              {tx.receiptCode}
                            </button>
                          </td>
                          <td className="py-2 text-slate-700">{tx.type}</td>
                          <td className="py-2 text-right font-mono tabular-nums">
                            {formatINR(tx.baseAmount)}
                          </td>
                          <td className="py-2 text-right font-mono tabular-nums text-teal-700">
                            {formatINR(tx.platformFee)}
                          </td>
                          <td className="py-2 text-right font-mono tabular-nums text-slate-500">
                            {formatINR(tx.gatewayFee)}
                          </td>
                          <td className="py-2 text-right font-mono font-semibold tabular-nums">
                            {formatINR(tx.totalAmount)}
                          </td>
                          <td className="py-2 font-semibold">{tx.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* AGENTS & PLANS TAB */}
          {activeTab === 'agents' && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="font-display text-lg font-bold text-[#0A2540]">
                Registered Insurance Agents & SaaS Subscriptions
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2.5 font-semibold">Agent / Agency</th>
                      <th className="py-2.5 font-semibold">Location & Licence</th>
                      <th className="py-2.5 text-center font-semibold">Customers</th>
                      <th className="py-2.5 font-semibold">Plan (₹699)</th>
                      <th className="py-2.5 font-semibold">SMS Add-On (₹49)</th>
                      <th className="py-2.5 text-right font-semibold">Manage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {state.agents.map((agt) => {
                      const count = state.policies.filter((p) => p.agentId === agt.id).length;
                      return (
                        <tr key={agt.id}>
                          <td className="py-3">
                            <p className="font-semibold text-slate-900">{agt.fullName}</p>
                            <p className="text-[11px] text-slate-500">{agt.agencyName}</p>
                          </td>
                          <td className="py-3">
                            <p className="text-slate-700">{agt.location}</p>
                            <p className="font-mono text-[11px] text-slate-500">
                              {agt.licenseNumber}
                            </p>
                          </td>
                          <td className="py-3 text-center font-mono font-semibold tabular-nums">
                            {count}
                          </td>
                          <td className="py-3 font-semibold">
                            <span
                              className={
                                agt.subscriptionStatus === 'Active'
                                  ? 'text-emerald-700'
                                  : 'text-amber-700'
                              }
                            >
                              {agt.subscriptionStatus}
                            </span>
                          </td>
                          <td className="py-3">
                            <button
                              type="button"
                              onClick={() =>
                                toggleAgentSmsPackage(agt.id, !agt.smsPackageEnabled)
                              }
                              className="rounded border border-slate-300 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              {agt.smsPackageEnabled ? 'SMS Active (₹49)' : 'Enable SMS'}
                            </button>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                adminUpdateAgentStatus(
                                  agt.id,
                                  agt.subscriptionStatus === 'Active'
                                    ? 'Pending Activation'
                                    : 'Active'
                                )
                              }
                              className="rounded bg-[#0A2540] px-3 py-1 font-semibold text-white hover:bg-[#13365a]"
                            >
                              {agt.subscriptionStatus === 'Active' ? 'Set Pending' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CUSTOMERS & CALENDARS TAB */}
          {activeTab === 'customers' && (
            <div className="space-y-6">
              {selectedCustomerForCalendar ? (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerForCalendar(null)}
                    className="text-xs font-semibold text-teal-700 hover:underline"
                  >
                    ← Back to All Policyholders
                  </button>
                  <PaymentCalendar
                    entries={selectedCustomerForCalendar.calendarEntries}
                    policyNumber={selectedCustomerForCalendar.policyNumber}
                    annualDueDate={formatDate(selectedCustomerForCalendar.annualDueDate)}
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h2 className="font-display text-lg font-bold text-[#0A2540]">
                    All Individual Policyholders & Policy Records
                  </h2>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="py-2.5 font-semibold">Customer</th>
                          <th className="py-2.5 font-semibold">Policy & Category</th>
                          <th className="py-2.5 text-right font-semibold">Annual Premium</th>
                          <th className="py-2.5 text-right font-semibold">Accumulated</th>
                          <th className="py-2.5 font-semibold">Mandate</th>
                          <th className="py-2.5 font-semibold">Misses</th>
                          <th className="py-2.5 text-right font-semibold">Calendar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {state.policies.map((pol) => (
                          <tr key={pol.id}>
                            <td className="py-3">
                              <p className="font-semibold text-slate-900">{pol.customerName}</p>
                              <p className="text-[11px] text-slate-500">{pol.customerEmail}</p>
                            </td>
                            <td className="py-3">
                              <p className="font-mono text-slate-800">{pol.policyNumber}</p>
                              <p className="text-[11px] text-slate-500">
                                {pol.category} · {pol.insuranceCompany}
                              </p>
                            </td>
                            <td className="py-3 text-right font-mono tabular-nums">
                              {formatINR(pol.annualPremium, false)}
                            </td>
                            <td className="py-3 text-right font-mono font-semibold tabular-nums text-emerald-700">
                              {formatINR(pol.accumulatedBaseContribution, false)}
                            </td>
                            <td className="py-3 font-semibold text-slate-800">
                              {pol.mandateStatus}
                            </td>
                            <td className="py-3 font-mono text-slate-700">
                              {pol.consecutiveMissedMonths} consec.
                            </td>
                            <td className="py-3 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedCustomerForCalendar(pol)}
                                className="font-semibold text-teal-700 hover:underline"
                              >
                                View Calendar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUPPORT & ESCALATIONS TAB */}
          {activeTab === 'support' && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0A2540]">
                  Customer Complaints & Missed Payment Escalations
                </h2>
                <p className="text-xs text-slate-500">
                  Review submitted reasons and update resolution status in compliance with customer
                  terms and insurer policy conditions.
                </p>
              </div>

              <div className="space-y-4">
                {state.supportRequests.map((req: SupportRequest) => (
                  <div
                    key={req.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-display text-sm font-bold text-[#0A2540]">
                          {req.customerName} · {req.policyNumber}
                        </p>
                        <p className="text-slate-500">
                          {req.type} {req.reason ? `· Reason: ${req.reason}` : ''} · Submitted{' '}
                          {formatDate(req.submittedAt)}
                        </p>
                      </div>
                      <span className="font-semibold text-teal-700">Status: {req.status}</span>
                    </div>

                    <p className="text-slate-700 leading-relaxed">{req.message}</p>

                    <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-3">
                      <input
                        type="text"
                        placeholder="Add operations note..."
                        value={supportNoteDrafts[req.id] ?? req.adminNotes ?? ''}
                        onChange={(e) =>
                          setSupportNoteDrafts((prev) => ({ ...prev, [req.id]: e.target.value }))
                        }
                        className="flex-1 min-w-[200px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          adminUpdateSupportRequest(
                            req.id,
                            'Under Review',
                            supportNoteDrafts[req.id]
                          )
                        }
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-800 hover:bg-slate-100"
                      >
                        Mark Under Review
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          adminUpdateSupportRequest(req.id, 'Resolved', supportNoteDrafts[req.id])
                        }
                        className="rounded-lg bg-teal-600 px-3 py-1.5 font-semibold text-white hover:bg-teal-700"
                      >
                        Resolve Case
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Printable Financial Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-xs font-semibold text-teal-700">
                  DEMO FINANCIAL STATEMENT · STRICT REVENUE SEPARATION
                </p>
                <h3 className="font-display text-lg font-bold text-[#0A2540]">
                  AdharaFinx Platform Revenue & Custodial Summary
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <BrandMark variant="wordmark" />
                <span className="font-mono text-xs text-slate-500">
                  Generated {formatDate(new Date().toISOString().slice(0, 10))}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  A. AdharaFinx Operating Revenue (Monthly Run-Rate)
                </h4>
                <div className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex justify-between">
                    <span>Individual Platform Fees (1.5% of Monthly Base)</span>
                    <span className="font-mono font-semibold tabular-nums">
                      {formatINR(metrics.monthlyPlatformFeeRunRate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Agent Subscriptions (₹699 × {metrics.activeAgents} active)</span>
                    <span className="font-mono font-semibold tabular-nums">
                      {formatINR(metrics.monthlyAgentSubRevenue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Optional SMS Add-Ons (₹49 × {metrics.activeSmsAgents} active)</span>
                    <span className="font-mono font-semibold tabular-nums">
                      {formatINR(metrics.monthlySmsRevenue)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-[#0A2540]">
                    <span>Total Monthly Platform Revenue (Annualized: {formatINR(metrics.annualizedRevenue, false)})</span>
                    <span className="font-mono text-teal-700 tabular-nums">
                      {formatINR(metrics.totalMonthlyRevenue)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  B. Custodial Principal & Pass-Through Fees (Excluded from Revenue)
                </h4>
                <div className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Annual Premium Value Managed</span>
                    <span className="font-mono font-semibold tabular-nums">
                      {formatINR(metrics.totalAnnualPremiumManaged)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Base Principal Accumulated (Paid Cycles)</span>
                    <span className="font-mono font-semibold tabular-nums">
                      {formatINR(metrics.totalBasePrincipalCollected)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">2.2% Payment Gateway Pass-Through</span>
                    <span className="font-mono font-semibold tabular-nums">
                      {formatINR(metrics.totalGatewayPassThrough)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="no-print flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                Download CSV
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A2540] px-4 py-2 text-xs font-semibold text-white hover:bg-[#13365a]"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Statement
              </button>
            </div>
          </div>
        </div>
      )}

      <ReceiptModal
        transaction={receiptTx}
        policy={state.policies.find((p) => p.id === receiptTx?.policyId)}
        onClose={() => setReceiptTx(null)}
      />
    </div>
  );
};
