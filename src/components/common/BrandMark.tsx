import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

export const LOGO_ASSET_PATH = `${import.meta.env.BASE_URL}assets/aistudio/AdharaFinx_Premium_Finance_Logo_c719b9aa.png`;

interface BrandMarkProps {
  variant?: 'wordmark' | 'full-logo';
  className?: string;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ variant = 'wordmark', className = '' }) => {
  const [imgError, setImgError] = useState(false);

  if (variant === 'full-logo' && !imgError) {
    return (
      <img
        src={LOGO_ASSET_PATH}
        alt="AdharaFinx — Premium Management, Simplified"
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`object-contain ${className}`}
      />
    );
  }

  return (
    <span className={`inline-flex items-center gap-2 whitespace-nowrap shrink-0 ${className}`}>
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#0A2540] text-white">
        <ShieldCheck className="h-4 w-4 text-teal-400" />
      </span>
      <span className="font-display text-lg font-bold tracking-tight text-[#0A2540]">
        Adhara<span className="text-teal-700">Finx</span>
      </span>
    </span>
  );
};
