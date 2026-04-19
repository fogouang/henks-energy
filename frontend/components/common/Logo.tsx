'use client';

/**
 * J&S Energy Logo Component
 * Uses the official logo from jsenergy.nl
 */

import React from 'react';
import Image from 'next/image';

interface LogoProps {
  variant?: 'default' | 'white';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Logo({ variant = 'default', size = 'md', className = '' }: LogoProps) {
  const sizeStyles = {
    sm: { width: 120, height: 40 },
    md: { width: 180, height: 60 },
    lg: { width: 240, height: 80 },
  };

  const currentSize = sizeStyles[size];

  return (
    <div className={`flex items-center ${className}`}>
      <Image
        src="/logo.png"
        alt="J&S Energy Logo"
        width={currentSize.width}
        height={currentSize.height}
        priority
        style={{
          width: 'auto',
          height: 'auto',
          maxWidth: `${currentSize.width}px`,
          maxHeight: `${currentSize.height}px`,
        }}
      />
    </div>
  );
}

