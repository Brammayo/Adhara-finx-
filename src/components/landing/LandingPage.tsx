import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Lock,
  Shield,
  UserCheck,
  Users,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PolicyCategory, UserRole } from '../../types/adharafinx';
import { formatINR } from '../../utils/finance';
import { BrandMark } from '../common/BrandMark';
import { ContributionCalculator } from '../common/ContributionCalculator';

interface LandingPageProps {
  onOpenSampleOnboarding: (token: string) => void;
}

const DEMO_CREDENTIALS: Record<UserRole, Array<{ label: string; email: string; password: string; note: string }>> = {
  individual: [
    {
      label: 'Aarav Sharma (Active Policy)',
      email: 'customer.aarav@adharafinx.demo',
      password: 'User@123',
      note: '₹30,000 Health · 9 paid months',
    },
    {
      label: 'Priya Menon (Settlement Pending)',
      email: 'customer.priya@adharafinx.demo',
      password: 'User@123',
      note: '₹48,000 Term · 12/12 paid',
    },
    {
      label: 'Rohan Kulkarni (Missed Payment Alert)',
      email: 'customer.rohan@adharafinx.demo',
      password: 'User@123',
      note: '2 consecutive misses (Warning)',
    },
  ],
  agent: [
    {
      label: 'Rajeshwari Iyer (Active + SMS)',
      email: 'agent.iyer@adharafinx.demo',
      password: 'Agent@123',
      note: 'Chennai · 4 assigned customers',
    },
    {
      label: 'Vikramaditya Deshmukh (Active)',
      email: 'agent.deshmukh@adharafinx.demo',
      password: 'Agent@123',
      note: 'Pune · 3 assigned customers',
    },
  ],
  admin: [
    {
      label: 'AdharaFinx Operations Admin',
      email: 'admin@adharafinx.demo',
      password: 'Admin@123',
      note: 'Full platform & analytics control',
    },
  ],
};

const ALL_CATEGORIES: PolicyCategory[] = ['Health', 'Life', 'Term', 'Vehicle', 'Other'];

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenSampleOnboarding }) => {
  const { state, login, registerIndividual, registerAgent, resetDemoData } = useApp();

  const [authMode, setAuthMode] = useState<'login' | 'register-individual' | 'register-agent'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('individual');
  const [email, setEmail] = useState('customer.aarav@adharafinx.demo');
  const [password, setPassword] = useState('User@123');
  const [authError, setAuthError] = useState<string | null>(null);

  // Individual registration state
  const [indName, setIndName] = useState('');
  const [indEmail, setIndEmail] = useState('');
  const [indMobile, setIndMobile] = useState('');
  const [indPassword, setIndPassword] = useState('');

  // Agent registration state
  const [agtName, setAgtName] = useState('');
  const [agtAgency, setAgtAgency] = useState('');
  const [agtMobile, setAgtMobile] = useState('');
  const [agtEmail, setAgtEmail] = useState('');
  const [agtLocation, setAgtLocation] = useState('');
  const [agtCompanies, setAgtCompanies] = useState('Star Health, HDFC Life');
  const [agtCategories, setAgtCategories] = useState<PolicyCategory[]>(['Health', 'Life']);
  const [agtLicense, setAgtLicense] = useState('');
  const [agtPassword, setAgtPassword] = useState('');
  const [agtSms, setAgtSms] = useState(true);

  const summary = useMemo(() => {
    const totalAnnual = state.policies.reduce((sum, p) => sum + p.annualPremium, 0);
    const activeAgents = state.agents.filter((a) => a.subscriptionStatus === 'Active').length;
    return {
      totalPolicies: state.policies.length,
      totalAnnual,
      activeAgents,
      totalAgents: state.agents.length,
    };
  }, [state.policies, state.agents]);

  const handleRoleTabChange = (role: UserRole) => {
    setSelectedRole(role);
    setAuthError(null);
    const firstDemo = DEMO_CREDENTIALS[role][0];
    if (firstDemo) {
      setEmail(firstDemo.email);
      setPassword(firstDemo.password);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const res = login(email, password, selectedRole);
    if (!res.ok && res.error) {
      setAuthError(res.error);
    }
  };

  const handleIndRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!indName.trim() || !indEmail.trim() || !indMobile.trim() || indPassword.length < 4) {
      setAuthError('Please complete all fields (password min 4 characters).');
      return;
    }
    const res = registerIndividual({
      name: indName,
      email: indEmail,
      mobile: indMobile,
      password: indPassword,
    });
    if (!res.ok && res.error) setAuthError(res.error);
  };

  const handleAgentRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (
      !agtName.trim() ||
      !agtAgency.trim() ||
      !agtEmail.trim() ||
      !agtMobile.trim() ||
      !agtLicense.trim() ||
      agtPassword.length < 4
    ) {
      setAuthError('Please complete all required agency & IRDAI licence fields.');
      return;
    }
    const res = registerAgent({
      fullName: agtName,
      agencyName: agtAgency,
      mobile: agtMobile,
      email: agtEmail,
      location: agtLocation || 'Mumbai, Maharashtra',
      companiesRepresented: agtCompanies
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
      categoriesHandled: agtCategories,
      licenseNumber: agtLicense,
      password: agtPassword,
      enableSms: agtSms,
    });
    if (!res.ok && res.error) setAuthError(res.error);
  };

  const toggleCategory = (cat: PolicyCategory) => {
    setAgtCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const scrollToPortalAccess = (role?: UserRole) => {
    if (role) {
      setAuthMode('login');
      handleRoleTabChange(role);
    }
    document.getElementById('portal-access')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Strict 3-Zone Top Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-3.5">
          <a href="#top" className="whitespace-nowrap shrink-0">
            <BrandMark variant="wordmark" />
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#architecture"
              className="hover:text-[#0A2540] transition-colors whitespace-nowrap shrink-0"
            >
              Architecture
            </a>
            <a
              href="#calculator"
              className="hover:text-[#0A2540] transition-colors whitespace-nowrap shrink-0"
            >
              Calculator
            </a>
            <a
              href="#portals"
              className="hover:text-[#0A2540] transition-colors whitespace-nowrap shrink-0"
            >
              Role Portals
            </a>
            <a
              href="#governance"
              className="hover:text-[#0A2540] transition-colors whitespace-nowrap shrink-0"
            >
              Governance
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => scrollToPortalAccess('individual')}
              className="rounded-lg bg-[#0A2540] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#13365a] whitespace-nowrap shrink-0"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="top" className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-stretch gap-10 px-6 py-12 lg:grid-cols-12 lg:py-16">
          <div className="lg:col-span-7 flex flex-col justify-center">
            <p className="text-xs font-semibold tracking-wide text-teal-700">
              AdharaFinx Premium Management · Affordable Today. A Wealthier Tomorrow.
            </p>
            <h1
              className="mt-3 font-display font-extrabold tracking-tight text-[#0A2540] text-balance"
              style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', lineHeight: 1.08 }}
            >
              Premium Management, Simplified.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600">
              Convert lump-sum annual insurance premiums into transparent, predictable monthly
              contributions. AdharaFinx connects policyholders, licensed insurance agents, and
              centralized settlement workflows in one structured fintech ledger.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => scrollToPortalAccess('individual')}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 whitespace-nowrap shrink-0"
              >
                Access Role Portals
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#calculator"
                className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                Calculate Monthly Contribution
              </a>
            </div>

            <p className="mt-6 text-xs leading-relaxed text-slate-500">
              Platform Notice: AdharaFinx is a financial technology platform, not an insurance
              company, insurer, lender, or underwriter. All payments, eNACH mandates, and
              settlements in this prototype run in simulated DEMO mode.
            </p>
          </div>

          {/* Brand & Live Portfolio Showcase */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-6 md:p-8">
            <div className="rounded-xl border border-slate-200 bg-white p-5 flex items-center justify-center">
              <BrandMark variant="full-logo" className="max-h-32 w-auto" />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Annual Premiums Managed</p>
                <p className="mt-1 font-mono text-xl font-bold text-[#0A2540] tabular-nums">
                  {formatINR(summary.totalAnnual, false)}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {summary.totalPolicies} active demo policies
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Registered Partner Agents</p>
                <p className="mt-1 font-mono text-xl font-bold text-teal-700 tabular-nums">
                  {summary.totalAgents} Agencies
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {summary.activeAgents} active subscriptions
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 text-xs">
              <span className="text-slate-600">Try an agent-issued customer invite flow:</span>
              <button
                type="button"
                onClick={() => onOpenSampleOnboarding('AFX-ONB-DIVYA26')}
                className="font-semibold text-teal-700 hover:text-teal-800 underline underline-offset-4 whitespace-nowrap shrink-0"
              >
                Open Sample Onboarding Link
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture / Value Chain */}
      <section id="architecture" className="mx-auto max-w-7xl px-6 py-14">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold text-teal-700">01. Platform Architecture</p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#0A2540] sm:text-3xl">
            Structured Premium Continuity Across Three Roles
          </h2>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="font-mono text-xs font-semibold text-teal-700">01 · Policyholder</p>
            <h3 className="mt-2 font-display text-lg font-bold text-[#0A2540]">
              Monthly Contribution & eNACH Ledger
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Register existing Health, Life, Term, or Vehicle policies, inspect exact 1.5% platform
              and 2.2% pass-through gateway fees, and track multi-year payment calendars.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="font-mono text-xs font-semibold text-[#0A2540]">02 · Insurance Agent</p>
            <h3 className="mt-2 font-display text-lg font-bold text-[#0A2540]">
              Client Onboarding & Renewal Oversight
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Subscribe at ₹699/month (optional ₹49 SMS pack), generate unique customer onboarding
              links, monitor mandate health, and prevent policy lapses.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="font-mono text-xs font-semibold text-amber-700">03 · Platform Admin</p>
            <h3 className="mt-2 font-display text-lg font-bold text-[#0A2540]">
              Strict Principal vs. Revenue Separation
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Approve annual settlements at policy due dates, reset contribution balances while
              preserving historical calendars, and audit separated SaaS revenue streams.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Calculator Section */}
      <section id="calculator" className="mx-auto max-w-7xl px-6 pb-14">
        <ContributionCalculator initialPremium={30000} initialCategory="Health" />
      </section>

      {/* Role Portals Overview */}
      <section id="portals" className="border-y border-slate-200 bg-white py-14">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-teal-700">02. Interactive Demo Access</p>
              <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#0A2540] sm:text-3xl">
                Three Dedicated Role Experiences
              </h2>
            </div>
            <button
              type="button"
              onClick={resetDemoData}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Prepopulated Demo Data
            </button>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-6">
              <div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#0A2540] text-white">
                  <UserCheck className="h-5 w-5 text-teal-400" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-[#0A2540]">
                  Individual Policyholder Portal
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Policy registration, simulated eNACH mandate controls, contribution ledger,
                  multi-year calendar, and 3-stage missed payment workflows.
                </p>
              </div>
              <button
                type="button"
                onClick={() => scrollToPortalAccess('individual')}
                className="mt-6 w-full rounded-lg border border-[#0A2540] bg-white px-4 py-2 text-xs font-semibold text-[#0A2540] hover:bg-[#0A2540] hover:text-white transition-colors"
              >
                Sign In as Policyholder
              </button>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-6">
              <div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-teal-700 text-white">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-[#0A2540]">
                  Insurance Agent Portal
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Manage assigned customers in table or card views, generate unique customer
                  onboarding links, and manage ₹699/mo + ₹49 SMS subscriptions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => scrollToPortalAccess('agent')}
                className="mt-6 w-full rounded-lg border border-teal-700 bg-white px-4 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-700 hover:text-white transition-colors"
              >
                Sign In as Agent
              </button>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-6">
              <div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600 text-white">
                  <Building2 className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-[#0A2540]">
                  AdharaFinx Admin Portal
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Platform KPIs, strict revenue analytics, annual settlement approvals, agent
                  management, support escalations, and financial report exports.
                </p>
              </div>
              <button
                type="button"
                onClick={() => scrollToPortalAccess('admin')}
                className="mt-6 w-full rounded-lg border border-amber-700 bg-white px-4 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-700 hover:text-white transition-colors"
              >
                Sign In as Admin
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Portal Sign-In & Registration Console */}
      <section id="portal-access" className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left: Auth Form */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="font-display text-xl font-bold text-[#0A2540]">
                  Role Portal Authentication
                </h2>
                <p className="text-xs text-slate-500">
                  Role-isolated sessions backed by persistent local demo state.
                </p>
              </div>

              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError(null);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    authMode === 'login'
                      ? 'bg-white text-[#0A2540] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register-individual');
                    setAuthError(null);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    authMode === 'register-individual'
                      ? 'bg-white text-[#0A2540] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Register Policyholder
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register-agent');
                    setAuthError(null);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    authMode === 'register-agent'
                      ? 'bg-white text-[#0A2540] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Register Agent
                </button>
              </div>
            </div>

            {authError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
                {authError}
              </div>
            )}

            {authMode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="mt-6 space-y-5">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Select Portal Role</label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(['individual', 'agent', 'admin'] as UserRole[]).map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => handleRoleTabChange(role)}
                        className={`rounded-lg border px-3 py-2.5 text-xs font-semibold capitalize transition-colors ${
                          selectedRole === role
                            ? 'border-[#0A2540] bg-[#0A2540] text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {role === 'individual'
                          ? 'Individual'
                          : role === 'agent'
                            ? 'Insurance Agent'
                            : 'Platform Admin'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="login-email" className="text-xs font-semibold text-slate-700">
                    Email Address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                  />
                </div>

                <div>
                  <label htmlFor="login-password" className="text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0A2540] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#13365a]"
                >
                  <Lock className="h-4 w-4 text-teal-400" />
                  Sign In to {selectedRole === 'individual' ? 'Individual' : selectedRole === 'agent' ? 'Agent' : 'Admin'} Portal
                </button>
              </form>
            )}

            {authMode === 'register-individual' && (
              <form onSubmit={handleIndRegister} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Vikram Nair"
                    value={indName}
                    onChange={(e) => setIndName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="vikram@example.com"
                    value={indEmail}
                    onChange={(e) => setIndEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98200 12345"
                    value={indMobile}
                    onChange={(e) => setIndMobile(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Create demo password"
                    value={indPassword}
                    onChange={(e) => setIndPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
                  >
                    Create Individual Account & Enter Portal
                  </button>
                </div>
              </form>
            )}

            {authMode === 'register-agent' && (
              <form onSubmit={handleAgentRegister} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Suresh Deshpande"
                    value={agtName}
                    onChange={(e) => setAgtName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Agency Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Deshpande Risk Advisors"
                    value={agtAgency}
                    onChange={(e) => setAgtAgency(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98221 90011"
                    value={agtMobile}
                    onChange={(e) => setAgtMobile(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="agent@agency.demo"
                    value={agtEmail}
                    onChange={(e) => setAgtEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">City / Location</label>
                  <input
                    type="text"
                    placeholder="Mumbai, Maharashtra"
                    value={agtLocation}
                    onChange={(e) => setAgtLocation(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">
                    IRDAI / Licence Registration No.
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="IRDAI-CA-2026-10291"
                    value={agtLicense}
                    onChange={(e) => setAgtLicense(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Insurance Companies Represented (comma separated)
                  </label>
                  <input
                    type="text"
                    value={agtCompanies}
                    onChange={(e) => setAgtCompanies(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">Categories Handled</label>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {ALL_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`rounded-md border px-3 py-1 text-xs font-medium ${
                          agtCategories.includes(cat)
                            ? 'border-[#0A2540] bg-[#0A2540] text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-700'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                  <div>
                    <p className="font-semibold text-slate-800">
                      Agent Plan: ₹699/month + Optional SMS Alert Package (₹49/month)
                    </p>
                    <p className="text-slate-500">
                      Subscription can be activated in simulated DEMO mode inside the portal.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agtSms}
                      onChange={(e) => setAgtSms(e.target.checked)}
                      className="h-4 w-4 accent-teal-600"
                    />
                    Include SMS (₹49)
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Create agent portal password"
                    value={agtPassword}
                    onChange={(e) => setAgtPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-[#0A2540] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#13365a]"
                  >
                    Register Agency & Open Agent Portal
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right: 1-Click Demo Credentials */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 md:p-8 flex flex-col justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-[#0A2540]">
                Prepopulated Demo Credentials
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Click any demo profile below to pre-fill credentials or sign in immediately.
              </p>

              <div className="mt-5 space-y-4">
                {(['individual', 'agent', 'admin'] as UserRole[]).map((role) => (
                  <div key={role} className="border-b border-slate-100 pb-4 last:border-b-0">
                    <p className="text-xs font-semibold text-slate-500 capitalize">
                      {role === 'individual'
                        ? 'Individual Policyholders'
                        : role === 'agent'
                          ? 'Insurance Agents'
                          : 'AdharaFinx Admin'}
                    </p>
                    <div className="mt-2 space-y-2">
                      {DEMO_CREDENTIALS[role].map((cred) => (
                        <div
                          key={cred.email}
                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-900">
                              {cred.label}
                            </p>
                            <p className="truncate font-mono text-[11px] text-slate-600">
                              {cred.email} · {cred.password}
                            </p>
                            <p className="text-[11px] text-slate-500">{cred.note}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode('login');
                              setSelectedRole(role);
                              setEmail(cred.email);
                              setPassword(cred.password);
                              login(cred.email, cred.password, role);
                            }}
                            className="rounded-md bg-[#0A2540] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#13365a] whitespace-nowrap shrink-0"
                          >
                            Enter
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Governance & Compliance Section */}
      <footer id="governance" className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
            <div className="md:col-span-5">
              <BrandMark variant="wordmark" />
              <p className="mt-3 text-sm font-medium text-[#0A2540]">
                Premium Management, Simplified. · Affordable Today. A Wealthier Tomorrow.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                AdharaFinx is a technology platform connecting policyholders, insurance agents, and
                administrative workflows. AdharaFinx is not an insurance company, insurer, lender,
                or underwriter.
              </p>
            </div>

            <div className="md:col-span-7 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs text-slate-600">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <Shield className="h-4 w-4 text-teal-700" />
                  <span>Customer Protection Rules</span>
                </div>
                <p className="mt-2 leading-relaxed">
                  Customer contributions are never arbitrarily confiscated or penalized. Policy
                  cancellation, refunds, and insurer conditions follow agreed customer terms.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <CheckCircle2 className="h-4 w-4 text-[#0A2540]" />
                  <span>DEMO Simulation Boundaries</span>
                </div>
                <p className="mt-2 leading-relaxed">
                  No live Razorpay integration, no live eNACH banking mandate, and no actual policy
                  issuance. All receipts and settlements are clearly marked DEMO.
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
