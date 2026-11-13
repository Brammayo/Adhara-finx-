import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createSeedState } from '../data/seedData';
import {
  AgentProfile,
  AppState,
  LedgerTransaction,
  MandateStatus,
  MissedReasonOption,
  PolicyCategory,
  PolicyRecord,
  SupportRequest,
  UserAccount,
  UserRole,
} from '../types/adharafinx';
import {
  AGENT_MONTHLY_SUBSCRIPTION,
  AGENT_SMS_PACKAGE_FEE,
  calculateContribution,
  generateId,
  getEscalationStage,
  MONTH_NAMES_SHORT,
  round2,
} from '../utils/finance';

const STORAGE_KEY = 'adharafinx_demo_state_v1';

interface RegisterIndividualInput {
  name: string;
  email: string;
  mobile: string;
  password: string;
}

interface RegisterAgentInput {
  fullName: string;
  agencyName: string;
  mobile: string;
  email: string;
  location: string;
  companiesRepresented: string[];
  categoriesHandled: PolicyCategory[];
  licenseNumber: string;
  password: string;
  enableSms: boolean;
}

interface AddPolicyInput {
  insuranceCompany: string;
  policyName: string;
  policyNumber: string;
  category: PolicyCategory;
  annualPremium: number;
  startDate: string;
  annualDueDate: string;
  expiryDate: string;
  policyholderName: string;
  nomineeDetails?: string;
}

interface AgentCreateCustomerInput extends AddPolicyInput {
  customerName: string;
  customerEmail: string;
  customerMobile: string;
}

interface AppContextValue {
  state: AppState;
  currentUser: UserAccount | null;
  currentAgentProfile: AgentProfile | null;
  login: (email: string, password: string, role?: UserRole) => { ok: boolean; error?: string };
  logout: () => void;
  registerIndividual: (input: RegisterIndividualInput) => { ok: boolean; error?: string };
  registerAgent: (input: RegisterAgentInput) => { ok: boolean; error?: string };
  addPolicyForCurrentUser: (input: AddPolicyInput) => PolicyRecord | null;
  simulatePolicyPayment: (policyId: string, outcome: 'Paid' | 'Failed') => void;
  updatePolicyMandate: (
    policyId: string,
    status: MandateStatus,
    bankAccountPlaceholder?: string
  ) => void;
  requestAnnualSettlement: (policyId: string) => void;
  submitMissedReason: (input: {
    policyId: string;
    reason: MissedReasonOption;
    message: string;
  }) => void;
  agentCreateCustomer: (input: AgentCreateCustomerInput) => {
    policy: PolicyRecord;
    onboardingToken: string;
  } | null;
  completeCustomerOnboarding: (input: {
    token: string;
    customerName: string;
    customerEmail: string;
    customerMobile: string;
    password: string;
    insuranceCompany: string;
    policyName: string;
    policyNumber: string;
    annualPremium: number;
    nomineeDetails?: string;
    bankAccountPlaceholder: string;
  }) => { ok: boolean; error?: string };
  toggleAgentSmsPackage: (agentId: string, enabled: boolean) => void;
  activateAgentSubscription: (agentId: string) => void;
  adminProcessSettlement: (policyId: string, decision: 'Approved' | 'Rejected', note?: string) => void;
  adminUpdateSupportRequest: (
    requestId: string,
    status: SupportRequest['status'],
    adminNotes?: string
  ) => void;
  adminUpdateAgentStatus: (agentId: string, status: AgentProfile['subscriptionStatus']) => void;
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function loadInitialState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.policies)) {
        return parsed;
      }
    }
  } catch {
    // Fallback to seed state
  }
  return createSeedState();
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(loadInitialState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota issues
    }
  }, [state]);

  const currentUser = useMemo(
    () => state.users.find((u) => u.id === state.currentUserId) ?? null,
    [state.users, state.currentUserId]
  );

  const currentAgentProfile = useMemo(() => {
    if (!currentUser || currentUser.role !== 'agent') return null;
    return state.agents.find((a) => a.userId === currentUser.id) ?? null;
  }, [currentUser, state.agents]);

  const login: AppContextValue['login'] = (email, password, role) => {
    const normalized = email.trim().toLowerCase();
    const user = state.users.find(
      (u) =>
        u.email.toLowerCase() === normalized &&
        u.password === password &&
        (!role || u.role === role)
    );
    if (!user) {
      return {
        ok: false,
        error: 'Invalid credentials for the selected role. Use one of the demo credentials or register a new account.',
      };
    }
    setState((prev) => ({ ...prev, currentUserId: user.id }));
    return { ok: true };
  };

  const logout = () => {
    setState((prev) => ({ ...prev, currentUserId: null }));
  };

  const registerIndividual: AppContextValue['registerIndividual'] = (input) => {
    const emailLower = input.email.trim().toLowerCase();
    if (state.users.some((u) => u.email.toLowerCase() === emailLower)) {
      return { ok: false, error: 'An account with this email already exists.' };
    }
    const newUser: UserAccount = {
      id: generateId('USR-CUS'),
      role: 'individual',
      name: input.name.trim(),
      email: input.email.trim(),
      mobile: input.mobile.trim(),
      password: input.password,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setState((prev) => ({
      ...prev,
      users: [...prev.users, newUser],
      currentUserId: newUser.id,
    }));
    return { ok: true };
  };

  const registerAgent: AppContextValue['registerAgent'] = (input) => {
    const emailLower = input.email.trim().toLowerCase();
    if (state.users.some((u) => u.email.toLowerCase() === emailLower)) {
      return { ok: false, error: 'An account with this email already exists.' };
    }
    const userId = generateId('USR-AGT');
    const agentId = generateId('AGT');
    const today = new Date().toISOString().slice(0, 10);

    const newUser: UserAccount = {
      id: userId,
      role: 'agent',
      name: input.fullName.trim(),
      email: input.email.trim(),
      mobile: input.mobile.trim(),
      password: input.password,
      createdAt: today,
    };

    const newAgent: AgentProfile = {
      id: agentId,
      userId,
      fullName: input.fullName.trim(),
      agencyName: input.agencyName.trim(),
      mobile: input.mobile.trim(),
      email: input.email.trim(),
      location: input.location.trim(),
      companiesRepresented: input.companiesRepresented,
      categoriesHandled: input.categoriesHandled.length ? input.categoriesHandled : ['Health', 'Life'],
      licenseNumber: input.licenseNumber.trim(),
      subscriptionStatus: 'Pending Activation',
      monthlyFee: AGENT_MONTHLY_SUBSCRIPTION,
      smsPackageEnabled: input.enableSms,
      smsMonthlyFee: input.enableSms ? AGENT_SMS_PACKAGE_FEE : 0,
      renewalDate: today,
      joinedDate: today,
      subscriptionHistory: [
        {
          id: generateId('SUB'),
          date: today,
          basePlanAmount: AGENT_MONTHLY_SUBSCRIPTION,
          smsAddonAmount: input.enableSms ? AGENT_SMS_PACKAGE_FEE : 0,
          totalAmount: AGENT_MONTHLY_SUBSCRIPTION + (input.enableSms ? AGENT_SMS_PACKAGE_FEE : 0),
          status: 'Pending (DEMO)',
          periodLabel: 'Initial Cycle',
        },
      ],
    };

    setState((prev) => ({
      ...prev,
      users: [...prev.users, newUser],
      agents: [...prev.agents, newAgent],
      currentUserId: userId,
    }));
    return { ok: true };
  };

  const addPolicyForCurrentUser: AppContextValue['addPolicyForCurrentUser'] = (input) => {
    if (!currentUser || currentUser.role !== 'individual') return null;
    const calc = calculateContribution(input.annualPremium);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const policyId = generateId('POL');

    const calendarEntries = Array.from({ length: 12 }, (_, idx) => {
      const d = new Date(currentYear, currentMonth + idx, 1);
      return {
        year: d.getFullYear(),
        month: d.getMonth(),
        status: idx === 0 ? ('Pending' as const) : ('Upcoming' as const),
        baseAmount: calc.monthlyBase,
        totalDebited: calc.totalMonthly,
      };
    });

    const newPolicy: PolicyRecord = {
      id: policyId,
      customerId: currentUser.id,
      customerName: currentUser.name,
      customerEmail: currentUser.email,
      customerMobile: currentUser.mobile,
      agentId: currentUser.agentId,
      onboardingStatus: 'Active',
      insuranceCompany: input.insuranceCompany.trim(),
      policyName: input.policyName.trim(),
      policyNumber: input.policyNumber.trim(),
      category: input.category,
      annualPremium: input.annualPremium,
      startDate: input.startDate,
      annualDueDate: input.annualDueDate,
      expiryDate: input.expiryDate,
      policyholderName: input.policyholderName.trim() || currentUser.name,
      nomineeDetails: input.nomineeDetails?.trim() || undefined,
      mandateStatus: 'Pending Activation',
      bankAccountPlaceholder: 'Awaiting Simulated eNACH Mandate (DEMO)',
      nextDebitDate: '2026-12-05',
      mandateHistory: [
        {
          id: generateId('MND'),
          date: now.toISOString().slice(0, 10),
          action: 'Initiated (DEMO)',
          bankAccountLabel: 'Pending Setup',
          note: 'Policy registered — activate simulated eNACH mandate to schedule monthly debits',
        },
      ],
      accumulatedBaseContribution: 0,
      paidMonths: 0,
      pendingMonths: 1,
      missedMonths: 0,
      consecutiveMissedMonths: 0,
      settlementStatus: 'Accumulating',
      calendarEntries,
    };

    setState((prev) => ({
      ...prev,
      policies: [newPolicy, ...prev.policies],
    }));
    return newPolicy;
  };

  const simulatePolicyPayment: AppContextValue['simulatePolicyPayment'] = (policyId, outcome) => {
    setState((prev) => {
      const policy = prev.policies.find((p) => p.id === policyId);
      if (!policy) return prev;
      const calc = calculateContribution(policy.annualPremium);
      const now = new Date();
      const todayIso = now.toISOString().slice(0, 10);

      // Find next Pending or Upcoming calendar entry, or append next month
      const updatedCalendar = [...policy.calendarEntries];
      let targetIndex = updatedCalendar.findIndex((c) => c.status === 'Pending');
      if (targetIndex === -1) {
        targetIndex = updatedCalendar.findIndex((c) => c.status === 'Upcoming');
      }

      let targetYear = now.getFullYear();
      let targetMonth = now.getMonth();

      if (targetIndex !== -1) {
        targetYear = updatedCalendar[targetIndex].year;
        targetMonth = updatedCalendar[targetIndex].month;
        updatedCalendar[targetIndex] = {
          ...updatedCalendar[targetIndex],
          status: outcome === 'Paid' ? 'Paid' : 'Failed',
        };
      } else {
        const last = updatedCalendar[updatedCalendar.length - 1];
        if (last) {
          const nextD = new Date(last.year, last.month + 1, 1);
          targetYear = nextD.getFullYear();
          targetMonth = nextD.getMonth();
        }
        updatedCalendar.push({
          year: targetYear,
          month: targetMonth,
          status: outcome === 'Paid' ? 'Paid' : 'Failed',
          baseAmount: calc.monthlyBase,
          totalDebited: calc.totalMonthly,
        });
      }

      const monthLabel = `${MONTH_NAMES_SHORT[targetMonth]} ${targetYear}`;
      const receiptCode = generateId('AFX-DEMO');

      const newTx: LedgerTransaction = {
        id: generateId('TX'),
        policyId: policy.id,
        customerId: policy.customerId,
        date: todayIso,
        monthLabel,
        type: 'Monthly Contribution',
        baseAmount: calc.monthlyBase,
        platformFee: calc.platformFee,
        gatewayFee: calc.gatewayFee,
        totalAmount: calc.totalMonthly,
        status: outcome,
        receiptCode,
        note:
          outcome === 'Paid'
            ? 'DEMO monthly contribution recorded via simulated eNACH'
            : 'DEMO simulated debit failure — retry or submit reason',
      };

      const nextPaid = outcome === 'Paid' ? policy.paidMonths + 1 : policy.paidMonths;
      const nextMissed = outcome === 'Failed' ? policy.missedMonths + 1 : policy.missedMonths;
      const nextConsecutiveMissed = outcome === 'Failed' ? policy.consecutiveMissedMonths + 1 : 0;
      const nextPending = updatedCalendar.filter((c) => c.status === 'Pending').length;
      const nextAccumulated =
        outcome === 'Paid'
          ? round2(policy.accumulatedBaseContribution + calc.monthlyBase)
          : policy.accumulatedBaseContribution;

      const reachedAnnualTarget = nextAccumulated >= policy.annualPremium;
      const nextSettlementStatus =
        reachedAnnualTarget && policy.settlementStatus === 'Accumulating'
          ? 'Settlement Pending'
          : policy.settlementStatus;

      const updatedPolicy: PolicyRecord = {
        ...policy,
        accumulatedBaseContribution: nextAccumulated,
        paidMonths: nextPaid,
        pendingMonths: nextPending,
        missedMonths: nextMissed,
        consecutiveMissedMonths: nextConsecutiveMissed,
        onboardingStatus: nextConsecutiveMissed >= 2 ? 'Action Required' : 'Active',
        settlementStatus: nextSettlementStatus,
        calendarEntries: updatedCalendar,
      };

      return {
        ...prev,
        policies: prev.policies.map((p) => (p.id === policyId ? updatedPolicy : p)),
        transactions: [newTx, ...prev.transactions],
      };
    });
  };

  const updatePolicyMandate: AppContextValue['updatePolicyMandate'] = (
    policyId,
    status,
    bankAccountPlaceholder
  ) => {
    setState((prev) => {
      const today = new Date().toISOString().slice(0, 10);
      return {
        ...prev,
        policies: prev.policies.map((p) => {
          if (p.id !== policyId) return p;
          const bankLabel = bankAccountPlaceholder?.trim() || p.bankAccountPlaceholder;
          const actionLabel =
            status === 'Active'
              ? 'Activated (DEMO)'
              : status === 'Cancelled'
                ? 'Cancelled (DEMO)'
                : status === 'Paused'
                  ? 'Paused (DEMO)'
                  : 'Initiated (DEMO)';
          return {
            ...p,
            mandateStatus: status,
            bankAccountPlaceholder: bankLabel,
            nextDebitDate: status === 'Active' ? '2026-12-05' : '—',
            mandateHistory: [
              {
                id: generateId('MND'),
                date: today,
                action: actionLabel,
                bankAccountLabel: bankLabel,
                note: `Mandate status updated to ${status} (DEMO simulation)`,
              },
              ...p.mandateHistory,
            ],
          };
        }),
      };
    });
  };

  const requestAnnualSettlement: AppContextValue['requestAnnualSettlement'] = (policyId) => {
    setState((prev) => ({
      ...prev,
      policies: prev.policies.map((p) =>
        p.id === policyId ? { ...p, settlementStatus: 'Settlement Pending' } : p
      ),
    }));
  };

  const submitMissedReason: AppContextValue['submitMissedReason'] = ({
    policyId,
    reason,
    message,
  }) => {
    setState((prev) => {
      const policy = prev.policies.find((p) => p.id === policyId);
      if (!policy) return prev;
      const stage = getEscalationStage(policy.consecutiveMissedMonths);
      const newReq: SupportRequest = {
        id: generateId('SUP'),
        customerId: policy.customerId,
        customerName: policy.customerName,
        policyId: policy.id,
        policyNumber: policy.policyNumber,
        agentId: policy.agentId,
        submittedAt: new Date().toISOString().slice(0, 10),
        type: 'Missed Payment Reason',
        escalationStage: stage === 'None' ? 'Reminder' : stage,
        reason,
        message: message.trim() || `Submitted reason: ${reason}`,
        status: 'Open',
      };
      return {
        ...prev,
        supportRequests: [newReq, ...prev.supportRequests],
      };
    });
  };

  const agentCreateCustomer: AppContextValue['agentCreateCustomer'] = (input) => {
    if (!currentAgentProfile) return null;
    const customerId = generateId('USR-CUS');
    const policyId = generateId('POL');
    const onboardingToken = generateId('AFX-ONB');
    const today = new Date().toISOString().slice(0, 10);
    const calc = calculateContribution(input.annualPremium);

    const newUser: UserAccount = {
      id: customerId,
      role: 'individual',
      name: input.customerName.trim(),
      email: input.customerEmail.trim(),
      mobile: input.customerMobile.trim(),
      password: 'User@123',
      createdAt: today,
      agentId: currentAgentProfile.id,
    };

    const now = new Date();
    const calendarEntries = Array.from({ length: 12 }, (_, idx) => {
      const d = new Date(now.getFullYear(), now.getMonth() + idx, 1);
      return {
        year: d.getFullYear(),
        month: d.getMonth(),
        status: idx === 0 ? ('Pending' as const) : ('Upcoming' as const),
        baseAmount: calc.monthlyBase,
        totalDebited: calc.totalMonthly,
      };
    });

    const newPolicy: PolicyRecord = {
      id: policyId,
      customerId,
      customerName: input.customerName.trim(),
      customerEmail: input.customerEmail.trim(),
      customerMobile: input.customerMobile.trim(),
      agentId: currentAgentProfile.id,
      onboardingToken,
      onboardingStatus: 'Pending Onboarding',
      insuranceCompany: input.insuranceCompany.trim(),
      policyName: input.policyName.trim(),
      policyNumber: input.policyNumber.trim(),
      category: input.category,
      annualPremium: input.annualPremium,
      startDate: input.startDate,
      annualDueDate: input.annualDueDate,
      expiryDate: input.expiryDate,
      policyholderName: input.policyholderName.trim() || input.customerName.trim(),
      nomineeDetails: input.nomineeDetails?.trim() || undefined,
      mandateStatus: 'Pending Activation',
      bankAccountPlaceholder: 'Awaiting Customer Onboarding (DEMO)',
      nextDebitDate: '2026-12-05',
      mandateHistory: [
        {
          id: generateId('MND'),
          date: today,
          action: 'Initiated (DEMO)',
          bankAccountLabel: 'Pending Onboarding',
          note: `Onboarding link created by ${currentAgentProfile.fullName}`,
        },
      ],
      accumulatedBaseContribution: 0,
      paidMonths: 0,
      pendingMonths: 1,
      missedMonths: 0,
      consecutiveMissedMonths: 0,
      settlementStatus: 'Accumulating',
      calendarEntries,
    };

    setState((prev) => ({
      ...prev,
      users: [...prev.users.filter((u) => u.email.toLowerCase() !== newUser.email.toLowerCase()), newUser],
      policies: [newPolicy, ...prev.policies],
    }));

    return { policy: newPolicy, onboardingToken };
  };

  const completeCustomerOnboarding: AppContextValue['completeCustomerOnboarding'] = (input) => {
    const policy = state.policies.find((p) => p.onboardingToken === input.token);
    if (!policy) {
      return { ok: false, error: 'Onboarding link is invalid or expired.' };
    }
    const today = new Date().toISOString().slice(0, 10);
    const calc = calculateContribution(input.annualPremium);

    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === policy.customerId
          ? {
              ...u,
              name: input.customerName.trim(),
              email: input.customerEmail.trim(),
              mobile: input.customerMobile.trim(),
              password: input.password || u.password,
            }
          : u
      ),
      policies: prev.policies.map((p) => {
        if (p.id !== policy.id) return p;
        return {
          ...p,
          customerName: input.customerName.trim(),
          customerEmail: input.customerEmail.trim(),
          customerMobile: input.customerMobile.trim(),
          policyholderName: input.customerName.trim(),
          insuranceCompany: input.insuranceCompany.trim(),
          policyName: input.policyName.trim(),
          policyNumber: input.policyNumber.trim(),
          annualPremium: input.annualPremium,
          nomineeDetails: input.nomineeDetails?.trim() || p.nomineeDetails,
          onboardingStatus: 'Active',
          mandateStatus: 'Active',
          bankAccountPlaceholder: input.bankAccountPlaceholder.trim(),
          nextDebitDate: '2026-12-05',
          calendarEntries: p.calendarEntries.map((c) => ({
            ...c,
            baseAmount: calc.monthlyBase,
            totalDebited: calc.totalMonthly,
          })),
          mandateHistory: [
            {
              id: generateId('MND'),
              date: today,
              action: 'Activated (DEMO)',
              bankAccountLabel: input.bankAccountPlaceholder.trim(),
              note: `Customer completed onboarding & activated simulated eNACH for ${calc.totalMonthly.toFixed(2)}/mo`,
            },
            ...p.mandateHistory,
          ],
        };
      }),
      currentUserId: policy.customerId,
    }));

    return { ok: true };
  };

  const toggleAgentSmsPackage: AppContextValue['toggleAgentSmsPackage'] = (agentId, enabled) => {
    setState((prev) => ({
      ...prev,
      agents: prev.agents.map((a) =>
        a.id === agentId
          ? {
              ...a,
              smsPackageEnabled: enabled,
              smsMonthlyFee: enabled ? AGENT_SMS_PACKAGE_FEE : 0,
            }
          : a
      ),
    }));
  };

  const activateAgentSubscription: AppContextValue['activateAgentSubscription'] = (agentId) => {
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())
      .toISOString()
      .slice(0, 10);

    setState((prev) => ({
      ...prev,
      agents: prev.agents.map((a) => {
        if (a.id !== agentId) return a;
        const smsFee = a.smsPackageEnabled ? AGENT_SMS_PACKAGE_FEE : 0;
        const invoice = {
          id: generateId('SUB'),
          date: todayIso,
          basePlanAmount: AGENT_MONTHLY_SUBSCRIPTION,
          smsAddonAmount: smsFee,
          totalAmount: AGENT_MONTHLY_SUBSCRIPTION + smsFee,
          status: 'Paid (DEMO)' as const,
          periodLabel: `${MONTH_NAMES_SHORT[today.getMonth()]} ${today.getFullYear()}`,
        };
        return {
          ...a,
          subscriptionStatus: 'Active',
          renewalDate: nextMonth,
          subscriptionHistory: [invoice, ...a.subscriptionHistory],
        };
      }),
    }));
  };

  const adminProcessSettlement: AppContextValue['adminProcessSettlement'] = (
    policyId,
    decision,
    note
  ) => {
    setState((prev) => {
      const policy = prev.policies.find((p) => p.id === policyId);
      if (!policy) return prev;
      const todayIso = new Date().toISOString().slice(0, 10);
      const settlementCode = generateId('AFX-SET-DEMO');

      if (decision === 'Rejected') {
        return {
          ...prev,
          policies: prev.policies.map((p) =>
            p.id === policyId ? { ...p, settlementStatus: 'Rejected' } : p
          ),
        };
      }

      const settledAmount = policy.accumulatedBaseContribution;
      const settlementTx: LedgerTransaction = {
        id: generateId('TX-SET'),
        policyId: policy.id,
        customerId: policy.customerId,
        date: todayIso,
        monthLabel: 'Annual Cycle Settlement',
        type: 'Annual Settlement',
        baseAmount: settledAmount,
        platformFee: 0,
        gatewayFee: 0,
        totalAmount: settledAmount,
        status: 'Settled',
        receiptCode: settlementCode,
        note:
          note?.trim() ||
          `DEMO Annual Settlement disbursed to ${policy.insuranceCompany}. Wallet reset; calendar preserved.`,
      };

      // Reset accumulated balance to 0 while preserving ALL calendar history & ledger records
      const updatedPolicy: PolicyRecord = {
        ...policy,
        accumulatedBaseContribution: 0,
        paidMonths: 0,
        missedMonths: 0,
        consecutiveMissedMonths: 0,
        settlementStatus: 'Settled',
        lastSettlementDate: todayIso,
        lastSettlementReceiptCode: settlementCode,
        calendarEntries: policy.calendarEntries.map((c) =>
          c.status === 'Paid' && !c.settledCycleYear
            ? { ...c, settledCycleYear: new Date().getFullYear() }
            : c
        ),
      };

      return {
        ...prev,
        policies: prev.policies.map((p) => (p.id === policyId ? updatedPolicy : p)),
        transactions: [settlementTx, ...prev.transactions],
      };
    });
  };

  const adminUpdateSupportRequest: AppContextValue['adminUpdateSupportRequest'] = (
    requestId,
    status,
    adminNotes
  ) => {
    setState((prev) => ({
      ...prev,
      supportRequests: prev.supportRequests.map((r) =>
        r.id === requestId
          ? { ...r, status, adminNotes: adminNotes !== undefined ? adminNotes : r.adminNotes }
          : r
      ),
    }));
  };

  const adminUpdateAgentStatus: AppContextValue['adminUpdateAgentStatus'] = (agentId, status) => {
    setState((prev) => ({
      ...prev,
      agents: prev.agents.map((a) => (a.id === agentId ? { ...a, subscriptionStatus: status } : a)),
    }));
  };

  const resetDemoData = () => {
    const fresh = createSeedState();
    setState(fresh);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  };

  return (
    <AppContext.Provider
      value={{
        state,
        currentUser,
        currentAgentProfile,
        login,
        logout,
        registerIndividual,
        registerAgent,
        addPolicyForCurrentUser,
        simulatePolicyPayment,
        updatePolicyMandate,
        requestAnnualSettlement,
        submitMissedReason,
        agentCreateCustomer,
        completeCustomerOnboarding,
        toggleAgentSmsPackage,
        activateAgentSubscription,
        adminProcessSettlement,
        adminUpdateSupportRequest,
        adminUpdateAgentStatus,
        resetDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
