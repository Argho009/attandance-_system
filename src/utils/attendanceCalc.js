export const rawPercent = (present, totalSkippingFalse) => {
  if (totalSkippingFalse === 0) return 0;
  return Number(((present / totalSkippingFalse) * 100).toFixed(2));
};

export const finalPercent = (present, condoned, totalSkippingFalse) => {
  if (totalSkippingFalse === 0) return 0;
  // Condoned lectures cannot exceed total absent
  const absent = totalSkippingFalse - present;
  const validCondoned = Math.min(condoned, absent);
  
  const pct = ((present + validCondoned) / totalSkippingFalse) * 100;
  // Final % capped at 100
  return Number(Math.min(100, pct).toFixed(2));
};

export const isLowAttendance = (finalPct) => {
  return finalPct < 75;
};

export const colorForPercent = (pct) => {
  if (pct >= 75) return 'text-green-600 bg-green-50';
  if (pct >= 65) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
};
