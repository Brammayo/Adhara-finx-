export type UserRole = 'individual' | 'agent' | 'admin';

export type PolicyCategory = 'Health' | 'Life' | 'Term' | 'Vehicle' | 'Other';

export type MandateStatus = 'Active' | 'Pending Activation' | 'Cancelled' | 'Paused';

export type PaymentMonthStatus = 'Paid' | 'Pending' | 'Failed' | 'Upcoming';

export type TransactionStatus = 'Paid' | 'Pending' | 'Failed' | 'Settled';

export type TransactionType = 'Monthly Contribution' | 'Annual Settlement' | 'Refund / Adjustment';

export type SettlementStatus =
  | 'Accumulating'
  | 'Settlement Pending'
  | 'Settled'
  | 'Rejected';

export type MissedEscalationStage = 'None' | 'Reminder' | 'Warning' | 'Escalation';

export type MissedReasonOption =
  | 'Financial difficulty'
  | 'Policy discontinued'
  | 'No longer interested'
  | 'Policyholder/beneficiary death'
  | 'Other reason';

export type OnboardingStatus = 'Pending Onboarding' | 'Active' | 'Action Required';

export type AgentSubscriptionStatus = 'Active' | 'Pending Activation' | 'Expired';

export interface UserAccount {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  mobile: string;
  password: string;
  createdAt: string;
  agentId?: string; // If individual was onboarded by an agent
}

export interface AgentSubscriptionInvoice {
  id: string;
  date: string;
  basePlanAmount: number; // ₹699
  smsAddonAmount: number; // ₹49 or ₹0
  totalAmount: number;
  status: 'Paid (DEMO)' | 'Pending (DEMO)';
  periodLabel: string;
}

export interface AgentProfile {
  id: string;
  userId: string;
  fullName: string;
  agencyName: string;
  mobile: string;
  email: string;
  location: string;
  companiesRepresented: string[];
  categoriesHandled: PolicyCategory[];
  licenseNumber: string;
  subscriptionStatus: AgentSubscriptionStatus;
  monthlyFee: number; // 699
  smsPackageEnabled: boolean;
  smsMonthlyFee: number; // 49
  renewalDate: string;
  joinedDate: string;
  subscriptionHistory: AgentSubscriptionInvoice[];
}

export interface MandateHistoryItem {
  id: string;
  date: string;
  action: 'Activated (DEMO)' | 'Cancelled (DEMO)' | 'Paused (DEMO)' | 'Initiated (DEMO)';
  bankAccountLabel: string;
  note: string;
}

export interface CalendarMonthEntry {
  year: number;
  month: number; // 0 = Jan .. 11 = Dec
  status: PaymentMonthStatus;
  baseAmount: number;
  totalDebited: number;
  settledCycleYear?: number;
  receiptId?: string;
}

export interface LedgerTransaction {
  id: string;
  policyId: string;
  customerId: string;
  date: string;
  monthLabel: string;
  type: TransactionType;
  baseAmount: number;
  platformFee: number; // 1.5%
  gatewayFee: number; // 2.2% pass-through
  totalAmount: number;
  status: TransactionStatus;
  receiptCode: string;
  note?: string;
}

export interface PolicyRecord {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  agentId?: string;
  onboardingToken?: string;
  onboardingStatus: OnboardingStatus;
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
  mandateStatus: MandateStatus;
  bankAccountPlaceholder: string;
  nextDebitDate: string;
  mandateHistory: MandateHistoryItem[];
  accumulatedBaseContribution: number;
  paidMonths: number;
  pendingMonths: number;
  missedMonths: number;
  consecutiveMissedMonths: number;
  settlementStatus: SettlementStatus;
  lastSettlementDate?: string;
  lastSettlementReceiptCode?: string;
  calendarEntries: CalendarMonthEntry[];
}

export interface SupportRequest {
  id: string;
  customerId: string;
  customerName: string;
  policyId: string;
  policyNumber: string;
  agentId?: string;
  submittedAt: string;
  type: 'Missed Payment Reason' | 'Support Ticket';
  escalationStage?: MissedEscalationStage;
  reason?: MissedReasonOption;
  message: string;
  status: 'Open' | 'Under Review' | 'Resolved';
  adminNotes?: string;
}

export interface ContributionBreakdown {
  annualPremium: number;
  monthlyBase: number;
  platformFee: number;
  gatewayFee: number;
  totalMonthly: number;
  annualBaseTotal: number;
  annualPlatformFeeTotal: number;
  annualGatewayFeeTotal: number;
  annualTotalPayable: number;
}

export interface AppState {
  users: UserAccount[];
  agents: AgentProfile[];
  policies: PolicyRecord[];
  transactions: LedgerTransaction[];
  supportRequests: SupportRequest[];
  currentUserId: string | null;
}
