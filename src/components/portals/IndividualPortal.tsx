import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  Calculator,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Plus,
  Receipt,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  LedgerTransaction,
  MissedReasonOption,
  PolicyCategory,
  PolicyRecord,
} from '../../types/adharafinx';
import {
  calculateContribution,
  formatDate,
  formatINR,
  getEscalationStage,
  round2,
} from '../../utils/finance';
import { BrandMark } from '../common/BrandMark';
import { ContributionCalculator } from '../common/ContributionCalculator';
import { MobileSheet } from '../common/MobileSheet';
import { PaymentCalendar } from '../common/PaymentCalendar';
import { ReceiptModal } from '../common/ReceiptModal';

type IndividualTab =
  | 'overview'
  | 'policies'
  | 'calculator'
  | 'mandate'
  | 'ledger'
  | 'calendar'
  | 'missed-reason';

const MISSED_REASONS: MissedReasonOption[] = [
  'Financial difficulty',
  'Policy discontinued',
  'No longer interested',
  'Policyholder/beneficiary death',
  'Other reason',
];

export const IndividualPortal: React.FC = () => {
  const {
    state,
    currentUser,
    logout,
    addPolicyForCurrentUser,
    simulatePolicyPayment,
    updatePolicyMandate,
    requestAnnualSettlement,
    submitMissedReason,
  } = useApp();

  const myPolicies = useMemo(
    () => state.policies.filter((p) => p.customerId === currentUser?.id),
    [state.policies, currentUser?.id]
  );

  const [activeTab, setActiveTab] = useState<IndividualTab>('overview');
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>(myPolicies[0]?.id ?? '');
  const [receiptTx, setReceiptTx] = useState<LedgerTransaction | null>(null);
  const [showAddPolicyForm, setShowAddPolicyForm] = useState(myPolicies.length === 0);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  // Add policy form state
  const [insuranceCompany, setInsuranceCompany] = useState('HDFC ERGO General Insurance');
  const [policyName, setPolicyName] = useState('Optima Secure Health Plan');
  const [policyNumber, setPolicyNumber] = useState('HERGO-2026-4490');
  const [category, setCategory] = useState<PolicyCategory>('Health');
  const [annualPremium, setAnnualPremium] = useState(30000);
  const [startDate, setStartDate] = useState('2026-11-15');
  const [annualDueDate, setAnnualDueDate] = useState('2027-11-15');
  const [expiryDate, setExpiryDate] = useState('2027-11-14');
  const [policyholderName, setPolicyholderName] = useState(currentUser?.name ?? '');
  const [nomineeDetails, setNomineeDetails] = useState('');

  // Mandate bank placeholder editor
  const [bankInput, setBankInput] = useState('HDFC Bank · XXXX 4821 (DEMO)');

  // Missed payment reason form
  const [selectedReason, setSelectedReason] = useState<MissedReasonOption>('Financial difficulty');
  const [reasonMessage, setReasonMessage] = useState('');
  const [reasonSubmittedBanner, setReasonSubmittedBanner] = useState(false);

  const activePolicy: PolicyRecord | undefined =
    myPolicies.find((p) => p.id === selectedPolicyId) ?? myPolicies[0];

  const myTransactions = useMemo(() => {
    if (!activePolicy) return [];
    return state.transactions.filter((t) => t.policyId === activePolicy.id);
  }, [state.transactions, activePolicy]);

  const mySupportRequests = useMemo(
    () => state.supportRequests.filter((r) => r.customerId === currentUser?.id),
    [state.supportRequests, currentUser?.id]
  );

  const calc = calculateContribution(activePolicy?.annualPremium ?? annualPremium);
  const remainingAnnual = activePolicy
    ? Math.max(0, round2(activePolicy.annualPremium - activePolicy.accumulatedBaseContribution))
    : 0;
  const escalationStage = activePolicy
    ? getEscalationStage(activePolicy.consecutiveMissedMonths)
    : 'None';

  const progressPct = activePolicy
    ? Math.min(
        100,
        Math.round((activePolicy.accumulatedBaseContribution / activePolicy.annualPremium) * 100)
      )
    : 0;

  const handleCreatePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    const created = addPolicyForCurrentUser({
      insuranceCompany,
      policyName,
      policyNumber,
      category,
      annualPremium,
      startDate,
      annualDueDate,
      expiryDate,
      policyholderName,
      nomineeDetails,
    });
    if (created) {
      setSelectedPolicyId(created.id);
      setShowAddPolicyForm(false);
      setActiveTab('overview');
    }
  };

  const handleSubmitReason = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePolicy) return;
    submitMissedReason({
      policyId: activePolicy.id,
      reason: selectedReason,
      message: reasonMessage,
    });
    setReasonMessage('');
    setReasonSubmittedBanner(true);
  };

  const navItems: Array<{ id: IndividualTab; label: string; icon: React.FC<{ className?: string }> }> =
    [
      { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'policies', label: 'My Policies', icon: FileText },
      { id: 'calculator', label: 'Calculator', icon: Calculator },
      { id: 'mandate', label: 'eNACH Mandate', icon: CreditCard },
      { id: 'ledger', label: 'Contribution Ledger', icon: Wallet },
      { id: 'calendar', label: 'Payment Calendar', icon: CalendarIcon },
      { id: 'missed-reason', label: 'Missed Payment & Support', icon: ShieldAlert },
    ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-slate-200 bg-white flex-col justify-between">
        <div>
          <div className="border-b border-slate-200 px-5 py-4">
            <BrandMark variant="wordmark" />
            <p className="mt-1 text-[11px] font-medium text-slate-500">
              Individual Policyholder Portal
            </p>
          </div>

          <nav className="p-3 flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
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

        <div className="border-t border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-900 truncate">{currentUser?.name}</p>
          <p className="text-[11px] text-slate-500 truncate">{currentUser?.email}</p>
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

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Compact Mobile Top App Bar (GPay / Razorpay style) */}
        <header className="lg:hidden sticky top-0 z-30 h-12 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0A2540] text-xs font-bold text-teal-400">
              {currentUser?.name?.charAt(0) ?? 'A'}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#0A2540] truncate">
                {navItems.find((n) => n.id === activeTab)?.label}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {activePolicy ? `${activePolicy.policyNumber} · ${activePolicy.category}` : 'AdharaFinx'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowAddPolicyForm(true);
                setActiveTab('policies');
              }}
              aria-label="Add policy"
              className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-teal-600 px-3 text-xs font-semibold text-white active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5" />
              Policy
            </button>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex border-b border-slate-200 bg-white px-6 py-3.5 items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            Policyholder Portal /{' '}
            <span className="font-semibold text-[#0A2540]">
              {navItems.find((n) => n.id === activeTab)?.label}
            </span>
          </p>

          <div className="flex items-center gap-3">
            {myPolicies.length > 0 && (
              <select
                aria-label="Select active policy"
                value={activePolicy?.id ?? ''}
                onChange={(e) => setSelectedPolicyId(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-teal-600 focus:outline-none"
              >
                {myPolicies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.policyNumber} · {p.category} ({formatINR(p.annualPremium, false)})
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => {
                setShowAddPolicyForm(true);
                setActiveTab('policies');
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Policy
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 pb-20 lg:p-6 lg:pb-6 max-w-6xl w-full mx-auto space-y-5">
          {/* Mobile Policy Switcher Strip when customer has multiple policies */}
          {myPolicies.length > 1 && (
            <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-1">
              {myPolicies.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPolicyId(p.id)}
                  className={`min-h-[38px] rounded-xl border px-3 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    p.id === activePolicy?.id
                      ? 'border-[#0A2540] bg-[#0A2540] text-white'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  {p.category} · {p.policyNumber}
                </button>
              ))}
            </div>
          )}

          {/* Empty State if user has no policies */}
          {!activePolicy && activeTab !== 'policies' && activeTab !== 'calculator' ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <h2 className="font-display text-xl font-bold text-[#0A2540]">
                Register Your First Insurance Policy
              </h2>
              <p className="mt-2 text-sm text-slate-600 max-w-lg mx-auto">
                Add an existing Health, Life, Term, or Vehicle policy to calculate your monthly
                contribution schedule and activate a simulated eNACH mandate.
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowAddPolicyForm(true);
                  setActiveTab('policies');
                }}
                className="mt-5 min-h-[44px] rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-teal-700"
              >
                Add Existing Policy
              </button>
            </div>
          ) : null}

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && activePolicy && (
            <>
              {/* Automated Missed Payment Escalation Notification */}
              {escalationStage !== 'None' && (
                <div
                  className={`rounded-2xl border p-4 md:p-5 flex flex-wrap items-start justify-between gap-4 ${
                    escalationStage === 'Escalation'
                      ? 'border-red-300 bg-red-50'
                      : escalationStage === 'Warning'
                        ? 'border-amber-300 bg-amber-50'
                        : 'border-sky-300 bg-sky-50'
                  }`}
                >
                  <div className="flex items-start gap-3 max-w-2xl">
                    <AlertTriangle
                      className={`h-5 w-5 shrink-0 mt-0.5 ${
                        escalationStage === 'Escalation'
                          ? 'text-red-700'
                          : escalationStage === 'Warning'
                            ? 'text-amber-700'
                            : 'text-sky-700'
                      }`}
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {activePolicy.consecutiveMissedMonths === 1
                          ? '1st Consecutive Missed Payment — Reminder'
                          : activePolicy.consecutiveMissedMonths === 2
                            ? '2nd Consecutive Missed Payment — Warning'
                            : `${activePolicy.consecutiveMissedMonths} Consecutive Missed Payments — Escalation`}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-700">
                        Accumulated contributions ({formatINR(activePolicy.accumulatedBaseContribution)})
                        are never automatically confiscated. Policy cancellation, refunds, and charges
                        follow agreed terms and insurer conditions.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('missed-reason')}
                    className="min-h-[44px] w-full sm:w-auto rounded-xl bg-[#0A2540] px-4 py-2 text-xs font-semibold text-white hover:bg-[#13365a] whitespace-nowrap shrink-0"
                  >
                    Submit Reason
                  </button>
                </div>
              )}

              {/* Mobile GPay / Razorpay Fintech Hero Wallet Card */}
              <div className="rounded-2xl bg-gradient-to-br from-[#0A2540] via-[#0F3154] to-[#0D9488] p-5 text-white shadow-sm lg:hidden">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-teal-200 truncate">
                      {activePolicy.insuranceCompany}
                    </p>
                    <h1 className="mt-0.5 font-display text-lg font-bold truncate">
                      {activePolicy.policyName}
                    </h1>
                  </div>
                  <span className="rounded-lg bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white whitespace-nowrap shrink-0">
                    {activePolicy.mandateStatus}
                  </span>
                </div>

                <div className="mt-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] text-slate-300">Accumulated Towards Annual</p>
                    <p className="mt-0.5 font-mono text-3xl font-bold tabular-nums">
                      {formatINR(activePolicy.accumulatedBaseContribution, false)}
                    </p>
                    <p className="mt-1 text-xs text-teal-200 font-mono tabular-nums">
                      Target: {formatINR(activePolicy.annualPremium, false)} · Rem:{' '}
                      {formatINR(remainingAnnual, false)}
                    </p>
                  </div>

                  {/* Compact SVG Progress Ring */}
                  <div className="relative h-14 w-14 shrink-0 flex items-center justify-center">
                    <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
                      <circle
                        cx="18"
                        cy="18"
                        r="15"
                        fill="none"
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth="3"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="15"
                        fill="none"
                        stroke="#5EEAD4"
                        strokeWidth="3"
                        strokeDasharray={`${progressPct}, 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute font-mono text-[11px] font-bold">{progressPct}%</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3 text-xs">
                  <span>
                    Monthly Debit:{' '}
                    <strong className="font-mono tabular-nums">
                      {formatINR(calc.totalMonthly)}
                    </strong>
                  </span>
                  <span className="font-mono text-teal-200">
                    Next: {formatDate(activePolicy.nextDebitDate)}
                  </span>
                </div>
              </div>

              {/* Mobile GPay / Razorpay 4-Column Quick Action Circles */}
              <div className="grid grid-cols-4 gap-2 lg:hidden">
                <button
                  type="button"
                  onClick={() => simulatePolicyPayment(activePolicy.id, 'Paid')}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-3 px-1 active:scale-[0.97] transition-transform"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                    <ArrowDownLeft className="h-5 w-5" />
                  </span>
                  <span className="text-[11px] font-semibold text-slate-800 whitespace-nowrap">
                    Pay Cycle
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('mandate')}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-3 px-1 active:scale-[0.97] transition-transform"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-[#0A2540]">
                    <CreditCard className="h-5 w-5" />
                  </span>
                  <span className="text-[11px] font-semibold text-slate-800 whitespace-nowrap">
                    Mandate
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('calendar')}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-3 px-1 active:scale-[0.97] transition-transform"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-50 text-sky-700">
                    <CalendarIcon className="h-5 w-5" />
                  </span>
                  <span className="text-[11px] font-semibold text-slate-800 whitespace-nowrap">
                    Calendar
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => simulatePolicyPayment(activePolicy.id, 'Failed')}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-3 px-1 active:scale-[0.97] transition-transform"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-700">
                    <AlertTriangle className="h-5 w-5" />
                  </span>
                  <span className="text-[11px] font-semibold text-slate-800 whitespace-nowrap">
                    Sim Miss
                  </span>
                </button>
              </div>

              {/* Desktop Primary Policy Header */}
              <div className="hidden lg:flex rounded-xl border border-slate-200 bg-white p-6 items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500">
                    {activePolicy.insuranceCompany} · {activePolicy.category} ·{' '}
                    <span className="font-mono">{activePolicy.policyNumber}</span>
                  </p>
                  <h1 className="mt-1 font-display text-2xl font-bold text-[#0A2540]">
                    {activePolicy.policyName}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => simulatePolicyPayment(activePolicy.id, 'Paid')}
                    className="rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-700 whitespace-nowrap shrink-0"
                  >
                    Simulate Monthly Debit (Paid · DEMO)
                  </button>
                  <button
                    type="button"
                    onClick={() => simulatePolicyPayment(activePolicy.id, 'Failed')}
                    className="rounded-lg border border-red-300 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 whitespace-nowrap shrink-0"
                  >
                    Simulate Failed Debit (DEMO)
                  </button>
                </div>
              </div>

              {/* Metrics Grid (2-col on mobile, 5-col on desktop) */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
                <div className="rounded-2xl lg:rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Annual Premium</p>
                  <p className="mt-1 font-mono text-lg lg:text-xl font-bold text-[#0A2540] tabular-nums">
                    {formatINR(activePolicy.annualPremium, false)}
                  </p>
                </div>
                <div className="rounded-2xl lg:rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Monthly Contribution</p>
                  <p className="mt-1 font-mono text-lg lg:text-xl font-bold text-teal-700 tabular-nums">
                    {formatINR(calc.totalMonthly)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Base {formatINR(calc.monthlyBase)}
                  </p>
                </div>
                <div className="hidden lg:block rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Total Accumulated</p>
                  <p className="mt-1 font-mono text-xl font-bold text-emerald-700 tabular-nums">
                    {formatINR(activePolicy.accumulatedBaseContribution, false)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">Base principal saved</p>
                </div>
                <div className="rounded-2xl lg:rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Remaining Target</p>
                  <p className="mt-1 font-mono text-lg lg:text-xl font-bold text-slate-900 tabular-nums">
                    {formatINR(remainingAnnual, false)}
                  </p>
                </div>
                <div className="rounded-2xl lg:rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Annual Renewal</p>
                  <p className="mt-1 font-mono text-sm lg:text-base font-bold text-[#0A2540]">
                    {formatDate(activePolicy.annualDueDate)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {activePolicy.settlementStatus}
                  </p>
                </div>
              </div>

              {/* Cycle Counts Strip */}
              <div className="grid grid-cols-3 gap-3 lg:grid-cols-5 lg:gap-4">
                <div className="rounded-2xl lg:rounded-xl border border-slate-200 bg-white p-3.5 lg:p-4">
                  <p className="text-[11px] lg:text-xs text-slate-500">Paid</p>
                  <p className="mt-1 font-mono text-lg font-bold text-emerald-700 tabular-nums">
                    {activePolicy.paidMonths} mo
                  </p>
                </div>
                <div className="rounded-2xl lg:rounded-xl border border-slate-200 bg-white p-3.5 lg:p-4">
                  <p className="text-[11px] lg:text-xs text-slate-500">Pending</p>
                  <p className="mt-1 font-mono text-lg font-bold text-amber-700 tabular-nums">
                    {activePolicy.pendingMonths} mo
                  </p>
                </div>
                <div className="rounded-2xl lg:rounded-xl border border-slate-200 bg-white p-3.5 lg:p-4">
                  <p className="text-[11px] lg:text-xs text-slate-500">Missed</p>
                  <p className="mt-1 font-mono text-lg font-bold text-red-700 tabular-nums">
                    {activePolicy.missedMonths} mo
                  </p>
                </div>
                <div className="hidden lg:block rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Next Debit Date</p>
                  <p className="mt-1 font-mono text-sm font-bold text-slate-900">
                    {formatDate(activePolicy.nextDebitDate)}
                  </p>
                </div>
                <div className="hidden lg:block rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Mandate Status</p>
                  <p className="mt-1 font-display text-sm font-bold text-[#0A2540]">
                    {activePolicy.mandateStatus}
                  </p>
                </div>
              </div>

              {/* Recent Activity Tap List (Mobile GPay / Razorpay feed) */}
              <div className="rounded-2xl lg:rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-bold text-[#0A2540]">
                    Recent Contribution Activity
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ledger')}
                    className="text-xs font-semibold text-teal-700 hover:underline min-h-[36px]"
                  >
                    Full Ledger →
                  </button>
                </div>

                <div className="mt-3 divide-y divide-slate-100">
                  {myTransactions.slice(0, 4).map((tx) => (
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() => setReceiptTx(tx)}
                      className="w-full min-h-[60px] py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                            tx.status === 'Paid' || tx.status === 'Settled'
                              ? 'bg-emerald-50 text-emerald-700'
                              : tx.status === 'Failed'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          <Receipt className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {tx.monthLabel} · {tx.type}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {formatDate(tx.date)} · {tx.status}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs font-bold text-[#0A2540] tabular-nums">
                          {formatINR(tx.totalAmount)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* POLICIES TAB */}
          {activeTab === 'policies' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#0A2540]">
                    Registered Insurance Policies
                  </h2>
                  <p className="text-xs text-slate-500">
                    AdharaFinx manages monthly contribution scheduling for your existing policies.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddPolicyForm((v) => !v)}
                  className="min-h-[44px] rounded-xl bg-[#0A2540] px-4 py-2 text-xs font-semibold text-white hover:bg-[#13365a]"
                >
                  {showAddPolicyForm ? 'Close Policy Form' : 'Register New Policy'}
                </button>
              </div>

              {showAddPolicyForm && (
                <form
                  onSubmit={handleCreatePolicy}
                  className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 space-y-5"
                >
                  <h3 className="font-display text-lg font-bold text-[#0A2540]">
                    Add Existing Annual Insurance Policy
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700">
                        Insurance Company
                      </label>
                      <input
                        type="text"
                        required
                        value={insuranceCompany}
                        onChange={(e) => setInsuranceCompany(e.target.value)}
                        className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700">Policy Name</label>
                      <input
                        type="text"
                        required
                        value={policyName}
                        onChange={(e) => setPolicyName(e.target.value)}
                        className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700">Policy Number</label>
                      <input
                        type="text"
                        required
                        value={policyNumber}
                        onChange={(e) => setPolicyNumber(e.target.value)}
                        className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700">
                        Policy Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as PolicyCategory)}
                        className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
                        Annual Premium (₹)
                      </label>
                      <input
                        type="number"
                        required
                        min={1200}
                        value={annualPremium}
                        onChange={(e) => setAnnualPremium(Math.max(1200, Number(e.target.value)))}
                        className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700">
                        Policyholder Name
                      </label>
                      <input
                        type="text"
                        required
                        value={policyholderName}
                        onChange={(e) => setPolicyholderName(e.target.value)}
                        className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700">
                        Policy Start Date
                      </label>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700">
                        Annual Premium Due Date
                      </label>
                      <input
                        type="date"
                        required
                        value={annualDueDate}
                        onChange={(e) => setAnnualDueDate(e.target.value)}
                        className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700">
                        Policy Expiry Date
                      </label>
                      <input
                        type="date"
                        required
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className="text-xs font-semibold text-slate-700">
                        Nominee / Beneficiary Details (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Spouse / Parent full name & relationship"
                        value={nomineeDetails}
                        onChange={(e) => setNomineeDetails(e.target.value)}
                        className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div>
                      <span className="text-slate-500">Base:</span>{' '}
                      <strong className="font-mono text-slate-900">
                        {formatINR(calculateContribution(annualPremium).monthlyBase)}
                      </strong>
                      <span className="mx-2 text-slate-300">|</span>
                      <span className="text-slate-500">1.5% Fee:</span>{' '}
                      <strong className="font-mono text-slate-900">
                        {formatINR(calculateContribution(annualPremium).platformFee)}
                      </strong>
                      <span className="mx-2 text-slate-300">|</span>
                      <span className="text-slate-500">2.2% GW:</span>{' '}
                      <strong className="font-mono text-slate-900">
                        {formatINR(calculateContribution(annualPremium).gatewayFee)}
                      </strong>
                    </div>
                    <div className="font-mono text-sm font-bold text-teal-700">
                      Total Monthly: {formatINR(calculateContribution(annualPremium).totalMonthly)}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="min-h-[48px] w-full sm:w-auto rounded-xl bg-teal-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-teal-700"
                  >
                    Save Policy & Calculate Schedule
                  </button>
                </form>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {myPolicies.map((pol) => {
                  const c = calculateContribution(pol.annualPremium);
                  return (
                    <div
                      key={pol.id}
                      className={`rounded-2xl border bg-white p-5 ${
                        pol.id === activePolicy?.id ? 'border-[#0A2540]' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs text-slate-500">
                            {pol.category} · {pol.insuranceCompany}
                          </p>
                          <h3 className="mt-1 font-display text-lg font-bold text-[#0A2540]">
                            {pol.policyName}
                          </h3>
                          <p className="font-mono text-xs text-slate-600">{pol.policyNumber}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPolicyId(pol.id);
                            setActiveTab('overview');
                          }}
                          className="min-h-[40px] rounded-xl border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                        >
                          Select
                        </button>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs">
                        <div>
                          <span className="text-slate-500">Annual Premium</span>
                          <p className="font-mono font-semibold text-slate-900 tabular-nums">
                            {formatINR(pol.annualPremium)}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500">Monthly Debit</span>
                          <p className="font-mono font-semibold text-teal-700 tabular-nums">
                            {formatINR(c.totalMonthly)}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500">Start / Due Date</span>
                          <p className="font-medium text-slate-800">
                            {formatDate(pol.startDate)} → {formatDate(pol.annualDueDate)}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500">Nominee</span>
                          <p className="font-medium text-slate-800">
                            {pol.nomineeDetails || 'Not specified'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CALCULATOR TAB */}
          {activeTab === 'calculator' && (
            <ContributionCalculator
              initialPremium={activePolicy?.annualPremium ?? 30000}
              initialCategory={activePolicy?.category ?? 'Health'}
              onApplyPremium={(premium, cat) => {
                setAnnualPremium(premium);
                setCategory(cat);
                setShowAddPolicyForm(true);
                setActiveTab('policies');
              }}
            />
          )}

          {/* MANDATE TAB */}
          {activeTab === 'mandate' && activePolicy && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                <strong>DEMO Simulation Notice:</strong> This eNACH mandate interface demonstrates
                mandate lifecycle controls using placeholder bank details. No real banking
                credentials or NPCI mandates are connected.
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <p className="text-xs text-slate-500">
                      Policy {activePolicy.policyNumber} · {activePolicy.policyName}
                    </p>
                    <h2 className="mt-1 font-display text-xl font-bold text-[#0A2540]">
                      Simulated eNACH Mandate Control
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Current Status</p>
                    <p className="mt-0.5 font-display text-lg font-bold text-teal-700">
                      {activePolicy.mandateStatus}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Monthly Debit Amount</p>
                    <p className="mt-1 font-mono text-lg font-bold text-[#0A2540] tabular-nums">
                      {formatINR(calc.totalMonthly)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Next Debit Date</p>
                    <p className="mt-1 font-mono text-lg font-bold text-slate-900">
                      {formatDate(activePolicy.nextDebitDate)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Bank Account Placeholder</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {activePolicy.bankAccountPlaceholder}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-4 border-t border-slate-100 pt-5">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">
                      Simulated Bank Placeholder Label (DEMO)
                    </label>
                    <input
                      type="text"
                      value={bankInput}
                      onChange={(e) => setBankInput(e.target.value)}
                      className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => updatePolicyMandate(activePolicy.id, 'Active', bankInput)}
                      className="min-h-[44px] rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-teal-700"
                    >
                      Activate Mandate (DEMO)
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePolicyMandate(activePolicy.id, 'Paused', bankInput)}
                      className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Pause Mandate (DEMO)
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePolicyMandate(activePolicy.id, 'Cancelled', bankInput)}
                      className="min-h-[44px] rounded-xl border border-red-300 bg-white px-4 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      Cancel Mandate (DEMO)
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
                <h3 className="font-display text-base font-bold text-[#0A2540]">Mandate History</h3>
                <div className="mt-3 divide-y divide-slate-100">
                  {activePolicy.mandateHistory.map((item) => (
                    <div key={item.id} className="py-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[#0A2540]">{item.action}</span>
                        <span className="font-mono text-slate-500">{formatDate(item.date)}</span>
                      </div>
                      <p className="mt-1 text-slate-700">{item.bankAccountLabel}</p>
                      <p className="mt-0.5 text-slate-500">{item.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* LEDGER TAB */}
          {activeTab === 'ledger' && activePolicy && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <p className="text-xs font-semibold text-amber-700">
                      DEMO SIMULATED CONTRIBUTION LEDGER · NOT A REAL STORED-VALUE WALLET
                    </p>
                    <h2 className="mt-1 font-display text-xl font-bold text-[#0A2540]">
                      Accumulated Contributions & Annual Settlement
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Current Accumulated Balance</p>
                    <p className="mt-0.5 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
                      {formatINR(activePolicy.accumulatedBaseContribution)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-slate-500">Annual Settlement Status</p>
                    <p className="mt-1 font-display text-base font-bold text-[#0A2540]">
                      {activePolicy.settlementStatus}
                    </p>
                    <p className="mt-1 text-slate-500">
                      Due Date: {formatDate(activePolicy.annualDueDate)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-slate-500">Last Settlement Acknowledgement</p>
                    <p className="mt-1 font-mono font-semibold text-slate-900">
                      {activePolicy.lastSettlementReceiptCode || 'Pending Cycle Completion'}
                    </p>
                    {activePolicy.lastSettlementDate && (
                      <p className="mt-1 text-slate-500">
                        Settled on {formatDate(activePolicy.lastSettlementDate)}
                      </p>
                    )}
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between">
                    <p className="text-slate-600">
                      At the annual due date, request settlement so Admin can disburse and reset the
                      cycle balance.
                    </p>
                    {activePolicy.settlementStatus === 'Accumulating' &&
                      activePolicy.accumulatedBaseContribution > 0 && (
                        <button
                          type="button"
                          onClick={() => requestAnnualSettlement(activePolicy.id)}
                          className="mt-2 min-h-[40px] rounded-xl bg-[#0A2540] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#13365a]"
                        >
                          Flag Settlement Pending (DEMO)
                        </button>
                      )}
                  </div>
                </div>
              </div>

              {/* Mobile Tap List for Ledger */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 md:hidden">
                <h3 className="font-display text-base font-bold text-[#0A2540]">
                  Ledger Transactions (DEMO)
                </h3>
                <div className="mt-3 divide-y divide-slate-100">
                  {myTransactions.map((tx) => (
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() => setReceiptTx(tx)}
                      className="w-full min-h-[64px] py-3 flex items-center justify-between gap-3 text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                            tx.status === 'Paid' || tx.status === 'Settled'
                              ? 'bg-emerald-50 text-emerald-700'
                              : tx.status === 'Failed'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          <Receipt className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {tx.monthLabel} · {tx.status}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            Base {formatINR(tx.baseAmount)} · Fee {formatINR(tx.platformFee)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-xs font-bold text-[#0A2540] tabular-nums">
                          {formatINR(tx.totalAmount)}
                        </p>
                        <p className="font-mono text-[10px] text-teal-700">View Receipt</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Desktop Ledger Table */}
              <div className="hidden md:block rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="font-display text-base font-bold text-[#0A2540]">
                  Contribution & Settlement Ledger History (DEMO)
                </h3>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2.5 font-semibold">Date</th>
                        <th className="py-2.5 font-semibold">Cycle / Type</th>
                        <th className="py-2.5 text-right font-semibold">Base</th>
                        <th className="py-2.5 text-right font-semibold">Platform (1.5%)</th>
                        <th className="py-2.5 text-right font-semibold">Gateway (2.2%)</th>
                        <th className="py-2.5 text-right font-semibold">Total</th>
                        <th className="py-2.5 font-semibold">Status</th>
                        <th className="py-2.5 text-right font-semibold">DEMO Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {myTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 font-mono text-slate-700">{formatDate(tx.date)}</td>
                          <td className="py-2.5">
                            <p className="font-semibold text-slate-900">{tx.monthLabel}</p>
                            <p className="text-[11px] text-slate-500">{tx.type}</p>
                          </td>
                          <td className="py-2.5 text-right font-mono tabular-nums text-slate-900">
                            {formatINR(tx.baseAmount)}
                          </td>
                          <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">
                            {formatINR(tx.platformFee)}
                          </td>
                          <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">
                            {formatINR(tx.gatewayFee)}
                          </td>
                          <td className="py-2.5 text-right font-mono font-semibold tabular-nums text-[#0A2540]">
                            {formatINR(tx.totalAmount)}
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`font-semibold ${
                                tx.status === 'Paid' || tx.status === 'Settled'
                                  ? 'text-emerald-700'
                                  : tx.status === 'Failed'
                                    ? 'text-red-700'
                                    : 'text-amber-700'
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => setReceiptTx(tx)}
                              className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-teal-700 hover:underline"
                            >
                              <Receipt className="h-3.5 w-3.5" />
                              {tx.receiptCode}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* CALENDAR TAB */}
          {activeTab === 'calendar' && activePolicy && (
            <PaymentCalendar
              entries={activePolicy.calendarEntries}
              policyNumber={activePolicy.policyNumber}
              annualDueDate={formatDate(activePolicy.annualDueDate)}
            />
          )}

          {/* MISSED PAYMENT & SUPPORT TAB */}
          {activeTab === 'missed-reason' && activePolicy && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
                <h2 className="font-display text-xl font-bold text-[#0A2540]">
                  Missed Payment Escalation & Reason Submission
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  Policy {activePolicy.policyNumber} · Consecutive Missed Months:{' '}
                  <strong className="font-mono text-slate-900">
                    {activePolicy.consecutiveMissedMonths}
                  </strong>{' '}
                  · Stage: <strong>{escalationStage}</strong>
                </p>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
                  <div
                    className={`rounded-xl border p-3.5 ${
                      activePolicy.consecutiveMissedMonths === 1
                        ? 'border-sky-400 bg-sky-50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <p className="font-semibold text-slate-900">01. First Consecutive Miss</p>
                    <p className="mt-1 text-slate-600">
                      Friendly Reminder notice with payment retry & reason link.
                    </p>
                  </div>
                  <div
                    className={`rounded-xl border p-3.5 ${
                      activePolicy.consecutiveMissedMonths === 2
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <p className="font-semibold text-slate-900">02. Second Consecutive Miss</p>
                    <p className="mt-1 text-slate-600">
                      Formal Warning issued; agent alerted to assist policyholder.
                    </p>
                  </div>
                  <div
                    className={`rounded-xl border p-3.5 ${
                      activePolicy.consecutiveMissedMonths >= 3
                        ? 'border-red-400 bg-red-50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <p className="font-semibold text-slate-900">03. Third Consecutive Miss</p>
                    <p className="mt-1 text-slate-600">
                      Escalation to Admin Operations with mandatory reason documentation.
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
                  <strong>Policyholder Protection Notice:</strong> Policy cancellation, refunds, and
                  any applicable charges are subject to the agreed customer terms and the
                  insurer&apos;s policy conditions. AdharaFinx never automatically confiscates
                  customer contributions or deducts arbitrary penalties.
                </div>

                {reasonSubmittedBanner && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" />
                    Your missed payment reason has been logged and shared with Operations & your
                    assigned advisor.
                  </div>
                )}

                <form onSubmit={handleSubmitReason} className="mt-6 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">
                      Select Reason for Missed Payment or Support Request
                    </label>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {MISSED_REASONS.map((reason) => (
                        <label
                          key={reason}
                          className={`flex min-h-[44px] items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs font-medium cursor-pointer ${
                            selectedReason === reason
                              ? 'border-[#0A2540] bg-[#0A2540] text-white'
                              : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="missed-reason"
                            value={reason}
                            checked={selectedReason === reason}
                            onChange={() => setSelectedReason(reason)}
                            className="accent-teal-500"
                          />
                          <span>{reason}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700">
                      Additional Context / Preferred Resolution
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Explain your situation or request a temporary mandate pause / refund review..."
                      value={reasonMessage}
                      onChange={(e) => setReasonMessage(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-600 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="min-h-[48px] w-full sm:w-auto rounded-xl bg-[#0A2540] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#13365a]"
                  >
                    Submit Reason to AdharaFinx Support
                  </button>
                </form>
              </div>

              {mySupportRequests.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
                  <h3 className="font-display text-base font-bold text-[#0A2540]">
                    Your Submitted Notifications & Support Cases
                  </h3>
                  <div className="mt-4 space-y-3">
                    {mySupportRequests.map((req) => (
                      <div
                        key={req.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-[#0A2540]">
                            {req.reason || req.type} · {req.policyNumber}
                          </span>
                          <span className="font-semibold text-teal-700">Status: {req.status}</span>
                        </div>
                        <p className="mt-1.5 text-slate-700">{req.message}</p>
                        {req.adminNotes && (
                          <p className="mt-2 text-slate-600">
                            <strong>Operations Note:</strong> {req.adminNotes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar (GPay / Razorpay style) */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-15 pb-safe border-t border-slate-200 bg-white/95 backdrop-blur-md grid grid-cols-5 items-center"
      >
        {[
          { id: 'overview' as const, label: 'Home', icon: Home },
          { id: 'ledger' as const, label: 'Ledger', icon: Wallet },
          { id: 'calendar' as const, label: 'Calendar', icon: CalendarIcon },
          { id: 'mandate' as const, label: 'Mandate', icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-h-[44px] flex-col items-center justify-center ${
                active ? 'text-[#0A2540]' : 'text-slate-500'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'text-teal-600' : ''}`} />
              <span className="mt-0.5 text-[10px] font-semibold tracking-tight">{tab.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMoreOpen(true)}
          className={`flex min-h-[44px] flex-col items-center justify-center ${
            ['policies', 'calculator', 'missed-reason'].includes(activeTab)
              ? 'text-[#0A2540]'
              : 'text-slate-500'
          }`}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="mt-0.5 text-[10px] font-semibold tracking-tight">More</span>
        </button>
      </nav>

      {/* Mobile "More" Bottom Sheet */}
      <MobileSheet
        open={mobileMoreOpen}
        title={currentUser?.name ?? 'Account'}
        subtitle={currentUser?.email}
        onClose={() => setMobileMoreOpen(false)}
      >
        <div className="space-y-2">
          {[
            { id: 'policies' as const, label: 'My Registered Policies', icon: FileText },
            { id: 'calculator' as const, label: 'Monthly Contribution Calculator', icon: Calculator },
            { id: 'missed-reason' as const, label: 'Missed Payment & Support', icon: ShieldAlert },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMoreOpen(false);
                }}
                className="flex min-h-[52px] w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 text-left text-sm font-semibold text-[#0A2540]"
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-teal-700" />
                  {item.label}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            );
          })}
          <button
            type="button"
            onClick={logout}
            className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 text-sm font-semibold text-red-700"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </MobileSheet>

      <ReceiptModal
        transaction={receiptTx}
        policy={activePolicy}
        onClose={() => setReceiptTx(null)}
      />
    </div>
  );
};
