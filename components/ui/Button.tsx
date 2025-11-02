import React from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline';
};

export function Button({ variant = 'primary', className = '', ...props }: Props) {
  const base = 'rounded px-4 py-2 text-sm';
  const variants = variant === 'primary' ? 'bg-black text-white' : 'border';
  return <button className={`${base} ${variants} ${className}`} {...props} />;
}


