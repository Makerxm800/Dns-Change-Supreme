import React from 'react';
import * as Flags from 'country-flag-icons/react/3x2';
import { Globe } from 'lucide-react';

interface CountryFlagProps {
  code: string;
  countryName?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-5 h-3.5 rounded-[3px]',
  md: 'w-7 h-5 rounded-[4px]',
  lg: 'w-10 h-7 rounded-[5px]',
};

export const CountryFlag: React.FC<CountryFlagProps> = ({
  code,
  countryName,
  size = 'md',
  className = '',
}) => {
  const upper = (code || '').toUpperCase().trim();
  const FlagComp = (Flags as Record<string, React.ComponentType<React.SVGAttributes<SVGElement>>>)[upper];

  if (!FlagComp) {
    return (
      <span
        title={countryName || upper || 'Global'}
        className={`inline-flex items-center justify-center bg-slate-800 border border-slate-600/60 text-sky-400 shrink-0 ${SIZE_CLASSES[size]} ${className}`}
      >
        <Globe className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      </span>
    );
  }

  return (
    <span
      title={countryName || upper}
      className={`inline-flex overflow-hidden shrink-0 shadow-sm ring-1 ring-white/15 ${SIZE_CLASSES[size]} ${className}`}
    >
      <FlagComp className="w-full h-full object-cover" aria-label={countryName || upper} />
    </span>
  );
};
