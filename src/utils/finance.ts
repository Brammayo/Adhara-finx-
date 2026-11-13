import { ContributionBreakdown, MissedEscalationStage } from '../types/adharafinx';

export const PLATFORM_FEE_RATE = 0.015; // 1.5%
export const GATEWAY_FEE_RATE = 0.022; // 2.2% pass-through
export const AGENT_MONTHLY_SUBSCRIPTION = 699;
export const AGENT_SMS_PACKAGE_FEE = 49;

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateContribution(annualPremium: number): ContributionBreakdown {
  const safeAnnual = Math.max(0, Number.isFinite(annualPremium) ? annualPremium : 0);
  const monthlyBase = round2(safeAnnual / 12);
  const platformFee = round2(monthlyBase * PLATFORM_FEE_RATE);
  const gatewayFee = round2(monthlyBase * GATEWAY_FEE_RATE);
  const totalMonthly = round2(monthlyBase + platformFee + gatewayFee);

  return {
    annualPremium: round2(safeAnnual),
    monthlyBase,
    platformFee,
    gatewayFee,
    totalMonthly,
    annualBaseTotal: round2(monthlyBase * 12),
    annualPlatformFeeTotal: round2(platformFee * 12),
    annualGatewayFeeTotal: round2(gatewayFee * 12),
    annualTotalPayable: round2(totalMonthly * 12),
  };
}

export function formatINR(amount: number, showDecimals = true): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(safe);
}

export function formatDate(isoDate: string): string {
  if (!isoDate) return '—';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getEscalationStage(consecutiveMissed: number): MissedEscalationStage {
  if (consecutiveMissed <= 0) return 'None';
  if (consecutiveMissed === 1) return 'Reminder';
  if (consecutiveMissed === 2) return 'Warning';
  return 'Escalation';
}

export function generateId(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  const stamp = Date.now().toString(36).toUpperCase().slice(-4);
  return `${prefix}-${stamp}${rand}`;
}

export const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const MONTH_NAMES_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function downloadCSV(filename: string, rows: Array<Array<string | number>>): void {
  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => {
          const str = String(cell ?? '');
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    )
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
