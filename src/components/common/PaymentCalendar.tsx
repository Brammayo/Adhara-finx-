import React, { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, CheckCircle2, Clock, AlertTriangle, CircleDashed } from 'lucide-react';
import { CalendarMonthEntry, PaymentMonthStatus } from '../../types/adharafinx';
import { formatINR, MONTH_NAMES_FULL, MONTH_NAMES_SHORT } from '../../utils/finance';

interface PaymentCalendarProps {
  entries: CalendarMonthEntry[];
  policyNumber: string;
  annualDueDate: string;
}

const STATUS_STYLES: Record<
  PaymentMonthStatus,
  {
    bg: string;
    border: string;
    text: string;
    label: string;
    icon: React.FC<{ className?: string }>;
  }
> = {
  Paid: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
    label: 'Paid',
    icon: CheckCircle2,
  },
  Pending: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    label: 'Pending',
    icon: Clock,
  },
  Failed: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    label: 'Failed / Missed',
    icon: AlertTriangle,
  },
  Upcoming: {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-800',
    label: 'Upcoming',
    icon: CircleDashed,
  },
};

export const PaymentCalendar: React.FC<PaymentCalendarProps> = ({
  entries,
  policyNumber,
  annualDueDate,
}) => {
  const years = useMemo(() => {
    const unique = Array.from(new Set(entries.map((e) => e.year))).sort((a, b) => b - a);
    return unique.length ? unique : [new Date().getFullYear()];
  }, [entries]);

  const [selectedYear, setSelectedYear] = useState<number>(years[0]);
  const [viewMode, setViewMode] = useState<'yearly' | 'monthly'>('yearly');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  const yearEntriesMap = useMemo(() => {
    const map = new Map<number, CalendarMonthEntry>();
    entries.filter((e) => e.year === selectedYear).forEach((e) => map.set(e.month, e));
    return map;
  }, [entries, selectedYear]);

  const activeEntry = yearEntriesMap.get(selectedMonth);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <CalendarIcon className="h-4 w-4 text-teal-700" />
            <span>Multi-Year Persistent Payment Calendar · {policyNumber}</span>
          </div>
          <h3 className="mt-1 font-display text-lg font-bold text-[#0A2540]">
            Contribution Schedule & Historical Record
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Calendar records remain permanently preserved across all policy years, even after annual
            settlement resets the contribution wallet.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Year Switcher */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {years.map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => setSelectedYear(yr)}
                className={`rounded-md px-3 py-1 font-mono text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  selectedYear === yr
                    ? 'bg-white text-[#0A2540] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>

          {/* Yearly vs Monthly View */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setViewMode('yearly')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'yearly'
                  ? 'bg-white text-[#0A2540] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Yearly Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('monthly')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'monthly'
                  ? 'bg-white text-[#0A2540] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Detail
            </button>
          </div>
        </div>
      </div>

      {/* Explicit Status Legend (Color + Icon + Text) */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
        {(['Paid', 'Pending', 'Failed', 'Upcoming'] as PaymentMonthStatus[]).map((status) => {
          const style = STATUS_STYLES[status];
          const Icon = style.icon;
          return (
            <div key={status} className="inline-flex items-center gap-1.5 text-slate-700">
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded border ${style.bg} ${style.border} ${style.text}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="font-medium">{style.label}</span>
            </div>
          );
        })}
        <span className="ml-auto text-slate-500">
          Annual Due Date: <strong className="font-mono text-slate-800">{annualDueDate}</strong>
        </span>
      </div>

      {viewMode === 'yearly' ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {MONTH_NAMES_SHORT.map((mName, idx) => {
            const entry = yearEntriesMap.get(idx);
            const style = entry ? STATUS_STYLES[entry.status] : null;
            const Icon = style?.icon;

            return (
              <button
                key={mName}
                type="button"
                onClick={() => {
                  setSelectedMonth(idx);
                  setViewMode('monthly');
                }}
                className={`flex flex-col justify-between rounded-lg border p-3 text-left transition-colors ${
                  entry && style
                    ? `${style.bg} ${style.border} hover:brightness-97`
                    : 'border-slate-200 bg-slate-50/50 text-slate-400 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm font-semibold text-slate-900">
                    {mName} {selectedYear}
                  </span>
                  {Icon && style && <Icon className={`h-4 w-4 ${style.text}`} />}
                </div>
                <div className="mt-3">
                  {entry && style ? (
                    <>
                      <p className={`text-xs font-semibold ${style.text}`}>{style.label}</p>
                      <p className="mt-0.5 font-mono text-xs text-slate-700 tabular-nums">
                        {formatINR(entry.baseAmount, false)}
                      </p>
                      {entry.settledCycleYear && (
                        <p className="mt-1 text-[11px] font-medium text-slate-600">
                          Settled Cycle {entry.settledCycleYear}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-slate-400">No schedule</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-12">
          <div className="md:col-span-5">
            <label className="text-xs font-medium text-slate-600">Select Month ({selectedYear})</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {MONTH_NAMES_SHORT.map((mName, idx) => {
                const entry = yearEntriesMap.get(idx);
                return (
                  <button
                    key={mName}
                    type="button"
                    onClick={() => setSelectedMonth(idx)}
                    className={`rounded-md border px-2.5 py-2 text-xs font-medium transition-colors ${
                      selectedMonth === idx
                        ? 'border-[#0A2540] bg-[#0A2540] text-white'
                        : entry
                          ? 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                          : 'border-slate-100 bg-slate-50 text-slate-400'
                    }`}
                  >
                    {mName}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-7 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h4 className="font-display text-base font-bold text-[#0A2540]">
              {MONTH_NAMES_FULL[selectedMonth]} {selectedYear}
            </h4>
            {activeEntry ? (
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-600">Cycle Payment Status</span>
                  <span className={`font-semibold ${STATUS_STYLES[activeEntry.status].text}`}>
                    {STATUS_STYLES[activeEntry.status].label}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-600">Monthly Base Contribution</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {formatINR(activeEntry.baseAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-600">Total Monthly Debit (incl. fees)</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {formatINR(activeEntry.totalDebited)}
                  </span>
                </div>
                {activeEntry.settledCycleYear && (
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-600">Annual Settlement Archive</span>
                    <span className="font-medium text-emerald-700">
                      Settled in {activeEntry.settledCycleYear} Cycle (Preserved)
                    </span>
                  </div>
                )}
                {activeEntry.receiptId && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">DEMO Receipt Reference</span>
                    <span className="font-mono text-xs text-slate-800">{activeEntry.receiptId}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                No scheduled contribution entry recorded for {MONTH_NAMES_FULL[selectedMonth]}{' '}
                {selectedYear}.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
