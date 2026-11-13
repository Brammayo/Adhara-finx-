import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { calculateContribution, formatDate, formatINR } from '../../utils/finance';
import { BrandMark } from '../common/BrandMark';

interface CustomerOnboardingFlowProps {
  token: string;
  onExit: () => void;
}

export const CustomerOnboardingFlow: React.FC<CustomerOnboardingFlowProps> = ({ token, onExit }) => {
  const { state, completeCustomerOnboarding } = useApp();
  const policy = state.policies.find((p) => p.onboardingToken === token);
  const agent = policy ? state.agents.find((a) => a.id === policy.agentId) : undefined;

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [customerName, setCustomerName] = useState(policy?.customerName ?? '');
  const [customerEmail, setCustomerEmail] = useState(policy?.customerEmail ?? '');
  const [customerMobile, setCustomerMobile] = useState(policy?.customerMobile ?? '');
  const [password, setPassword] = useState('User@123');

  const [insuranceCompany, setInsuranceCompany] = useState(policy?.insuranceCompany ?? '');
  const [policyName, setPolicyName] = useState(policy?.policyName ?? '');
  const [policyNumber, setPolicyNumber] = useState(policy?.policyNumber ?? '');
  const [annualPremium, setAnnualPremium] = useState(policy?.annualPremium ?? 30000);
  const [nomineeDetails, setNomineeDetails] = useState(policy?.nomineeDetails ?? '');

  const [bankPlaceholder, setBankPlaceholder] = useState('HDFC Bank · XXXX 4102 (DEMO)');
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!policy) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border border-slate-200 bg-white p-8 text-center">
          <BrandMark variant="wordmark" />
          <h2 className="mt-5 font-display text-xl font-bold text-[#0A2540]">
            Onboarding Link Not Found
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            This unique customer onboarding token is unavailable or has been reset.
          </p>
          <button
            type="button"
            onClick={onExit}
            className="mt-6 rounded-lg bg-[#0A2540] px-4 py-2 text-xs font-semibold text-white hover:bg-[#13365a]"
          >
            Return to AdharaFinx Home
          </button>
        </div>
      </div>
    );
  }

  const calc = calculateContribution(annualPremium);

  const handleFinish = () => {
    setError(null);
    if (!acceptedTerms) {
      setError('Please confirm the DEMO simulated mandate authorization checkbox.');
      return;
    }
    const res = completeCustomerOnboarding({
      token,
      customerName,
      customerEmail,
      customerMobile,
      password,
      insuranceCompany,
      policyName,
      policyNumber,
      annualPremium,
      nomineeDetails,
      bankAccountPlaceholder: bankPlaceholder,
    });
    if (!res.ok && res.error) {
      setError(res.error);
    } else {
      onExit();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <BrandMark variant="wordmark" />
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Exit Onboarding Preview
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
          <div className="border-b border-slate-100 pb-5">
            <p className="text-xs font-semibold text-teal-700">
              Agent-Initiated Customer Onboarding · Token: {token}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-[#0A2540]">
              Complete Your Monthly Premium Plan Setup
            </h1>
            {agent && (
              <p className="mt-1 text-xs text-slate-600">
                Prepared by <strong>{agent.fullName}</strong> ({agent.agencyName} ·{' '}
                {agent.location})
              </p>
            )}

            {/* Stepper */}
            <div className="mt-5 grid grid-cols-4 gap-2 text-xs">
              {[
                { num: 1, label: '01. Register' },
                { num: 2, label: '02. Policy Info' },
                { num: 3, label: '03. Breakdown' },
                { num: 4, label: '04. Mandate (DEMO)' },
              ].map((s) => (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setStep(s.num as 1 | 2 | 3 | 4)}
                  className={`rounded-lg border px-2.5 py-2 font-semibold text-left transition-colors ${
                    step === s.num
                      ? 'border-[#0A2540] bg-[#0A2540] text-white'
                      : step > s.num
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="mt-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-[#0A2540]">
                Step 1: Verify Profile & Set Portal Password
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">Full Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Email</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Mobile Number</label>
                  <input
                    type="tel"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Create Portal Password (Demo)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-lg bg-[#0A2540] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#13365a]"
                >
                  Continue to Policy Confirmation
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="mt-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-[#0A2540]">
                Step 2: Confirm Existing Insurance Policy Information
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Insurance Company</label>
                  <input
                    type="text"
                    value={insuranceCompany}
                    onChange={(e) => setInsuranceCompany(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Policy Name</label>
                  <input
                    type="text"
                    value={policyName}
                    onChange={(e) => setPolicyName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Policy Number</label>
                  <input
                    type="text"
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Annual Premium (₹)</label>
                  <input
                    type="number"
                    value={annualPremium}
                    onChange={(e) => setAnnualPremium(Math.max(1200, Number(e.target.value)))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 font-mono text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Nominee / Beneficiary Details (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Spouse / Parent name"
                    value={nomineeDetails}
                    onChange={(e) => setNomineeDetails(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 flex flex-wrap gap-6">
                <span>
                  Category: <strong>{policy.category}</strong>
                </span>
                <span>
                  Annual Due Date: <strong>{formatDate(policy.annualDueDate)}</strong>
                </span>
                <span>
                  Policy Expiry: <strong>{formatDate(policy.expiryDate)}</strong>
                </span>
              </div>
              <div className="flex justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="rounded-lg bg-[#0A2540] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#13365a]"
                >
                  Review Contribution Calculation
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="mt-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-[#0A2540]">
                Step 3: Review Transparent Monthly Contribution
              </h2>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Annual Policy Premium</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {formatINR(calc.annualPremium)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Monthly Base Contribution (Annual ÷ 12)</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {formatINR(calc.monthlyBase)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">AdharaFinx Platform Fee (1.5%)</span>
                  <span className="font-mono text-slate-800 tabular-nums">
                    {formatINR(calc.platformFee)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Payment Gateway Charge (2.2% pass-through)</span>
                  <span className="font-mono text-slate-800 tabular-nums">
                    {formatINR(calc.gatewayFee)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold text-[#0A2540]">
                  <span>Total Monthly Contribution</span>
                  <span className="font-mono text-teal-700 tabular-nums">
                    {formatINR(calc.totalMonthly)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="rounded-lg bg-[#0A2540] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#13365a]"
                >
                  Proceed to Simulated eNACH Mandate
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="mt-6 space-y-5">
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                <ShieldCheck className="h-5 w-5 shrink-0 text-amber-700" />
                <div>
                  <p className="font-semibold">DEMO Simulated eNACH Mandate Setup</p>
                  <p className="mt-1">
                    No real bank credentials or NPCI eNACH infrastructure are used in this
                    prototype. Confirm a placeholder label below to activate your simulated mandate.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Demo Bank Account Placeholder Label
                </label>
                <input
                  type="text"
                  value={bankPlaceholder}
                  onChange={(e) => setBankPlaceholder(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-600">Monthly Debit Amount (DEMO)</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {formatINR(calc.totalMonthly)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">First Scheduled Debit Date</span>
                  <span className="font-mono font-semibold text-slate-900">05 Dec 2026</span>
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-teal-600"
                />
                <span>
                  I understand AdharaFinx is a technology platform (not an insurer or lender) and
                  authorize simulated DEMO monthly contribution scheduling subject to agreed terms.
                </span>
              </label>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-teal-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Activate Mandate (DEMO) & Open Customer Portal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
