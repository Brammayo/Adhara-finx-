import React, { useState } from 'react';
import { Calculator } from 'lucide-react';
import { PolicyCategory } from '../../types/adharafinx';
import { calculateContribution, formatINR } from '../../utils/finance';

interface ContributionCalculatorProps {
  initialPremium?: number;
  initialCategory?: PolicyCategory;
  compact?: boolean;
  onApplyPremium?: (premium: number, category: PolicyCategory) => void;
}

const PRESET_PREMIUMS = [18000, 30000, 48000, 72000, 120000];
const CATEGORIES: PolicyCategory[] = ['Health', 'Life', 'Term', 'Vehicle', 'Other'];

export const ContributionCalculator: React.FC<ContributionCalculatorProps> = ({
  initialPremium = 30000,
  initialCategory = 'Health',
  compact = false,
  onApplyPremium,
}) => {
  const [annualPremium, setAnnualPremium] = useState<number>(initialPremium);
  const [category, setCategory] = useState<PolicyCategory>(initialCategory);

  const calc = calculateContribution(annualPremium);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-teal-700">
            <Calculator className="h-4 w-4" />
            <span>Transparent Monthly Contribution Calculator</span>
          </div>
          <h3 className="mt-1 font-display text-xl font-bold tracking-tight text-[#0A2540]">
            Convert Lump-Sum Annual Premiums into Monthly Contributions
          </h3>
        </div>
        {!compact && (
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  category === cat
                    ? 'bg-[#0A2540] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Input Controls */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-6">
          <div>
            <div className="flex items-baseline justify-between">
              <label
                htmlFor="annual-premium-input"
                className="text-sm font-medium text-slate-700"
              >
                Annual Insurance Premium ({category})
              </label>
              <span className="font-mono text-lg font-semibold text-[#0A2540] tabular-nums">
                {formatINR(annualPremium, false)}
              </span>
            </div>

            <input
              id="annual-premium-input"
              type="range"
              min={6000}
              max={250000}
              step={1000}
              value={Math.min(250000, Math.max(6000, annualPremium))}
              onChange={(e) => setAnnualPremium(Number(e.target.value))}
              className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-teal-600"
            />

            <div className="mt-4">
              <label className="text-xs font-medium text-slate-500">
                Or enter exact annual premium (₹)
              </label>
              <div className="mt-1.5 flex items-center rounded-lg border border-slate-300 bg-white px-3 focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-600/20">
                <span className="font-mono text-sm text-slate-500">₹</span>
                <input
                  type="number"
                  min={1200}
                  max={5000000}
                  step={500}
                  value={annualPremium || ''}
                  onChange={(e) => setAnnualPremium(Math.max(0, Number(e.target.value)))}
                  className="w-full py-2 pl-2 font-mono text-sm font-medium text-slate-900 tabular-nums focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {PRESET_PREMIUMS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAnnualPremium(preset)}
                  className={`rounded-md border px-2.5 py-1 font-mono text-xs tabular-nums transition-colors whitespace-nowrap shrink-0 ${
                    annualPremium === preset
                      ? 'border-teal-600 bg-teal-50 font-semibold text-teal-800'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  {formatINR(preset, false)}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-4 text-xs leading-relaxed text-slate-600 border border-slate-200/80">
            <p className="font-semibold text-slate-800">Fee Structure Disclosure</p>
            <p className="mt-1">
              The 1.5% platform fee supports AdharaFinx scheduling and ledger infrastructure. The
              2.2% gateway charge is a simulated pass-through payment processing fee, not platform
              revenue.
            </p>
          </div>

          {onApplyPremium && (
            <button
              type="button"
              onClick={() => onApplyPremium(annualPremium, category)}
              className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 whitespace-nowrap shrink-0"
            >
              Use This Amount for New Policy
            </button>
          )}
        </div>

        {/* Transparent Calculation Ledger */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-6">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-medium text-slate-500">Total Monthly Contribution</p>
                <p className="mt-1 font-mono text-3xl font-bold text-[#0A2540] tabular-nums">
                  {formatINR(calc.totalMonthly)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-slate-500">Monthly Base Principal</p>
                <p className="mt-1 font-mono text-lg font-semibold text-teal-700 tabular-nums">
                  {formatINR(calc.monthlyBase)}
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="py-2 font-medium">Component</th>
                    <th className="py-2 text-right font-medium">Monthly</th>
                    <th className="py-2 text-right font-medium">Annual (12x)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70">
                  <tr>
                    <td className="py-2.5 font-medium text-slate-800">
                      Base Contribution (Annual / 12)
                    </td>
                    <td className="py-2.5 text-right font-mono font-medium text-slate-900 tabular-nums">
                      {formatINR(calc.monthlyBase)}
                    </td>
                    <td className="py-2.5 text-right font-mono text-slate-700 tabular-nums">
                      {formatINR(calc.annualBaseTotal)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-slate-700">
                      AdharaFinx Platform Fee <span className="text-xs text-slate-500">(1.5% of base)</span>
                    </td>
                    <td className="py-2.5 text-right font-mono text-slate-800 tabular-nums">
                      {formatINR(calc.platformFee)}
                    </td>
                    <td className="py-2.5 text-right font-mono text-slate-600 tabular-nums">
                      {formatINR(calc.annualPlatformFeeTotal)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-slate-700">
                      Payment Gateway Fee <span className="text-xs text-slate-500">(2.2% pass-through)</span>
                    </td>
                    <td className="py-2.5 text-right font-mono text-slate-800 tabular-nums">
                      {formatINR(calc.gatewayFee)}
                    </td>
                    <td className="py-2.5 text-right font-mono text-slate-600 tabular-nums">
                      {formatINR(calc.annualGatewayFeeTotal)}
                    </td>
                  </tr>
                  <tr className="bg-white font-semibold text-[#0A2540]">
                    <td className="py-3 pl-2">Total Payable</td>
                    <td className="py-3 text-right font-mono tabular-nums">
                      {formatINR(calc.totalMonthly)}
                    </td>
                    <td className="py-3 pr-2 text-right font-mono tabular-nums">
                      {formatINR(calc.annualTotalPayable)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs text-slate-500">
            <span>Formula: Base (Premium ÷ 12) + 1.5% Platform + 2.2% Gateway</span>
            <span className="font-medium text-amber-700">No insurer underwriting by AdharaFinx</span>
          </div>
        </div>
      </div>
    </div>
  );
};
