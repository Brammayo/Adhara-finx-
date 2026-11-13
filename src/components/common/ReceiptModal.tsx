import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { LedgerTransaction, PolicyRecord } from '../../types/adharafinx';
import { formatDate, formatINR } from '../../utils/finance';
import { BrandMark } from './BrandMark';

interface ReceiptModalProps {
  transaction: LedgerTransaction | null;
  policy?: PolicyRecord;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaction, policy, onClose }) => {
  if (!transaction) return null;

  const isSettlement = transaction.type === 'Annual Settlement';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-xs font-semibold text-amber-700">
              DEMO SIMULATION DOCUMENT · NOT A REAL FINANCIAL RECEIPT
            </p>
            <h3 className="mt-0.5 font-display text-lg font-bold text-[#0A2540]">
              {isSettlement
                ? 'DEMO Annual Settlement Acknowledgement'
                : 'DEMO Contribution Ledger Receipt'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close receipt"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <BrandMark variant="wordmark" />
            <div className="text-right">
              <p className="font-mono text-xs font-semibold text-slate-900">
                {transaction.receiptCode}
              </p>
              <p className="text-xs text-slate-500">{formatDate(transaction.date)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              Status: {transaction.status} (DEMO) ·{' '}
              {isSettlement
                ? 'Annual cycle balance settled & contribution wallet reset.'
                : 'Recorded in simulated contribution ledger.'}
            </span>
          </div>

          {policy && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-slate-500">Policyholder</p>
                <p className="mt-0.5 font-semibold text-slate-900">{policy.customerName}</p>
              </div>
              <div>
                <p className="text-slate-500">Policy Number</p>
                <p className="mt-0.5 font-mono font-semibold text-slate-900">
                  {policy.policyNumber}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Insurer</p>
                <p className="mt-0.5 font-medium text-slate-800">{policy.insuranceCompany}</p>
              </div>
              <div>
                <p className="text-slate-500">Cycle Period</p>
                <p className="mt-0.5 font-medium text-slate-800">{transaction.monthLabel}</p>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">
                {isSettlement ? 'Settled Annual Principal' : 'Monthly Base Contribution'}
              </span>
              <span className="font-mono font-medium text-slate-900 tabular-nums">
                {formatINR(transaction.baseAmount)}
              </span>
            </div>
            {!isSettlement && (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">AdharaFinx Platform Fee (1.5%)</span>
                  <span className="font-mono text-slate-700 tabular-nums">
                    {formatINR(transaction.platformFee)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Gateway Pass-Through Charge (2.2%)</span>
                  <span className="font-mono text-slate-700 tabular-nums">
                    {formatINR(transaction.gatewayFee)}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-[#0A2540]">
              <span>Total {isSettlement ? 'Disbursed' : 'Debited'} (DEMO)</span>
              <span className="font-mono tabular-nums">{formatINR(transaction.totalAmount)}</span>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-500">
            Disclaimer: AdharaFinx is a technology platform, not an insurance company, insurer,
            lender, or underwriter. This receipt is generated strictly for prototype demonstration.
          </p>
        </div>

        <div className="no-print flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5" />
            Print DEMO Receipt
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#0A2540] px-4 py-2 text-xs font-semibold text-white hover:bg-[#13365a]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
