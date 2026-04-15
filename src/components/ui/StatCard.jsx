import React from 'react';
import { cn } from './Button';

export const StatCard = ({ title, value, subtitle, color = 'indigo', className }) => {
  const colorMap = {
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-900",
    green: "bg-green-50 border-green-200 text-green-900",
    red: "bg-red-50 border-red-200 text-red-900",
    slate: "bg-slate-50 border-slate-200 text-slate-900",
  };

  const titleColorMap = {
    indigo: "text-indigo-600",
    green: "text-green-600",
    red: "text-red-600",
    slate: "text-slate-600",
  };

  return (
    <div className={cn("rounded-lg border p-6 shadow-sm", colorMap[color], className)}>
      <h3 className={cn("text-sm font-semibold uppercase tracking-wider", titleColorMap[color])}>
        {title}
      </h3>
      <div className="mt-2 flex items-baseline gap-x-2">
        <span className="text-3xl font-bold tracking-tight">{value}</span>
      </div>
      {subtitle && <p className="mt-1 text-sm opacity-80">{subtitle}</p>}
    </div>
  );
};
