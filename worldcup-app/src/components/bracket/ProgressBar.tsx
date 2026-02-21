"use client";

interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const percentage = Math.min(Math.round((current / total) * 100), 100);

  return (
    <div className="space-y-1">
      <p className="text-sm text-slate-500">
        {current} of {total} picks made
      </p>
      <div
        className="h-1.5 w-full rounded-full bg-slate-200"
        role="progressbar"
        aria-valuemin={0}
        aria-valuenow={current}
        aria-valuemax={total}
        aria-label="Bracket completion progress"
      >
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
