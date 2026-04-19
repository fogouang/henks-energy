'use client';

/**
 * Energy Flow Diagram Component
 * Visual representation of power flow between Solar, Battery, Home, and Grid
 */

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface EnergyFlowDiagramProps {
  solarPower: number;      // kW from solar panels
  batteryPower: number;    // kW (positive = discharging, negative = charging)
  batterySoC: number;      // Battery state of charge %
  gridImport: number;      // kW importing from grid
  gridExport: number;      // kW exporting to grid
  homeConsumption: number; // kW total home consumption
  className?: string;
}

export function EnergyFlowDiagram({
  solarPower,
  batteryPower,
  batterySoC,
  gridImport,
  gridExport,
  homeConsumption,
  className,
}: EnergyFlowDiagramProps) {
  const { t } = useLanguage();
  
  // Calculate flow directions and intensities
  const solarToHome = Math.min(solarPower, homeConsumption);
  const solarToBattery = batteryPower < 0 ? Math.min(solarPower - solarToHome, Math.abs(batteryPower)) : 0;
  const solarToGrid = gridExport;
  const batteryToHome = batteryPower > 0 ? batteryPower : 0;
  const gridToHome = gridImport;
  
  // Animation based on flow
  const getFlowAnimation = (power: number) => {
    if (power <= 0) return '';
    return 'animate-pulse';
  };
  
  // Flow line opacity based on power
  const getFlowOpacity = (power: number) => {
    if (power <= 0) return 0.2;
    if (power < 1) return 0.5;
    if (power < 3) return 0.7;
    return 1;
  };

  return (
    <div className={`card p-3 h-full flex flex-col ${className}`}>
      <div className="text-xs uppercase mb-2 text-text-muted">
        {t('energy.flow') || 'Energy Flow'}
      </div>
      
      <div className="flex-1 relative min-h-0">
        <svg viewBox="0 0 200 140" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            {/* Gradients for flow lines */}
            <linearGradient id="solarGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="batteryGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="gridGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00CED1" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            
            {/* Glow filter */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Solar Panel Icon (Top) */}
          <g transform="translate(85, 5)">
            <rect x="0" y="0" width="30" height="20" rx="2" fill="#f59e0b" fillOpacity="0.2" stroke="#f59e0b" strokeWidth="1"/>
            <line x1="10" y1="0" x2="10" y2="20" stroke="#f59e0b" strokeWidth="0.5"/>
            <line x1="20" y1="0" x2="20" y2="20" stroke="#f59e0b" strokeWidth="0.5"/>
            <line x1="0" y1="10" x2="30" y2="10" stroke="#f59e0b" strokeWidth="0.5"/>
            <text x="15" y="32" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="bold">
              {solarPower.toFixed(1)}kW
            </text>
          </g>
          
          {/* Home Icon (Center) */}
          <g transform="translate(85, 60)">
            <path d="M15 0 L28 12 L23 12 L23 24 L7 24 L7 12 L2 12 Z" fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="1"/>
            <text x="15" y="38" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="bold">
              {homeConsumption.toFixed(1)}kW
            </text>
          </g>
          
          {/* Battery Icon (Left) */}
          <g transform="translate(10, 58)">
            <rect x="5" y="5" width="26" height="16" rx="2" fill="#8b5cf6" fillOpacity="0.2" stroke="#8b5cf6" strokeWidth="1"/>
            <rect x="31" y="9" width="3" height="8" rx="1" fill="#8b5cf6" fillOpacity="0.4"/>
            {/* Battery fill based on SoC */}
            <rect x="7" y="7" width={Math.max(0, (batterySoC / 100) * 22)} height="12" rx="1" fill="#8b5cf6" fillOpacity="0.6"/>
            <text x="18" y="34" textAnchor="middle" fill="#8b5cf6" fontSize="8" fontWeight="bold">
              {batterySoC.toFixed(0)}%
            </text>
            <text x="18" y="44" textAnchor="middle" fill="#8b5cf6" fontSize="7">
              {batteryPower > 0 ? '+' : ''}{batteryPower.toFixed(1)}kW
            </text>
          </g>
          
          {/* Grid Icon (Right) */}
          <g transform="translate(158, 58)">
            <circle cx="15" cy="13" r="12" fill="#00CED1" fillOpacity="0.2" stroke="#00CED1" strokeWidth="1"/>
            <path d="M9 7 L15 19 L21 7" fill="none" stroke="#00CED1" strokeWidth="1.5"/>
            <text x="15" y="38" textAnchor="middle" fill="#00CED1" fontSize="8" fontWeight="bold">
              {gridImport > 0 ? `-${gridImport.toFixed(1)}` : `+${gridExport.toFixed(1)}`}kW
            </text>
          </g>
          
          {/* Flow Lines */}
          {/* Solar to Home */}
          <path
            d="M100 40 L100 60"
            fill="none"
            stroke="url(#solarGradient)"
            strokeWidth="2"
            strokeOpacity={getFlowOpacity(solarToHome)}
            filter={solarToHome > 0 ? "url(#glow)" : ""}
          />
          
          {/* Solar to Battery (curved) */}
          <path
            d="M85 25 Q50 40 40 58"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeOpacity={getFlowOpacity(solarToBattery)}
            strokeDasharray={solarToBattery > 0 ? "none" : "3,3"}
          />
          
          {/* Solar to Grid (curved) */}
          <path
            d="M115 25 Q150 40 165 58"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeOpacity={getFlowOpacity(solarToGrid)}
            strokeDasharray={solarToGrid > 0 ? "none" : "3,3"}
          />
          
          {/* Battery to Home */}
          <path
            d="M45 72 L85 72"
            fill="none"
            stroke="url(#batteryGradient)"
            strokeWidth="2"
            strokeOpacity={getFlowOpacity(batteryToHome)}
            filter={batteryToHome > 0 ? "url(#glow)" : ""}
          />
          
          {/* Grid to Home */}
          <path
            d="M158 72 L115 72"
            fill="none"
            stroke="url(#gridGradient)"
            strokeWidth="2"
            strokeOpacity={getFlowOpacity(gridToHome)}
            filter={gridToHome > 0 ? "url(#glow)" : ""}
          />
          
          {/* Flow direction arrows */}
          {solarToHome > 0 && (
            <polygon points="100,55 97,50 103,50" fill="#10b981"/>
          )}
          {batteryToHome > 0 && (
            <polygon points="70,72 64,69 64,75" fill="#10b981"/>
          )}
          {gridToHome > 0 && (
            <polygon points="130,72 136,69 136,75" fill="#10b981"/>
          )}
        </svg>
      </div>
      
      {/* Legend - compact inline */}
      <div className="flex items-center justify-center gap-3 mt-1 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></div>
          <span className="text-text-muted">Solar</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]"></div>
          <span className="text-text-muted">Bat</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00CED1]"></div>
          <span className="text-text-muted">Grid</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></div>
          <span className="text-text-muted">Home</span>
        </div>
      </div>
    </div>
  );
}
