import React from 'react';
import { Filter, Clock } from 'lucide-react';

interface OverlapThresholdFilterProps {
  minRatio: number;
  onMinRatioChange: (ratio: number) => void;
  minDurationMinutes: number;
  onMinDurationChange: (minutes: number) => void;
}

export const OverlapThresholdFilter: React.FC<OverlapThresholdFilterProps> = ({
  minRatio,
  onMinRatioChange,
  minDurationMinutes,
  onMinDurationChange,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card/60">
      {/* Attendance Threshold Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-primary" />
          Attendance:
        </span>
        <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
          <button
            type="button"
            onClick={() => onMinRatioChange(1.0)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              minRatio === 1.0
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            100% Free
          </button>
          <button
            type="button"
            onClick={() => onMinRatioChange(0.75)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              minRatio === 0.75
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            75%+ Free
          </button>
          <button
            type="button"
            onClick={() => onMinRatioChange(0.5)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              minRatio === 0.5
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All (50%+)
          </button>
        </div>
      </div>

      {/* Minimum Duration Selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-primary" />
          Min Length:
        </span>
        <select
          value={minDurationMinutes}
          onChange={(e) => onMinDurationChange(Number(e.target.value))}
          aria-label="Select minimum window duration"
          className="h-8 px-2 rounded-lg border border-border bg-background text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value={30}>30 mins+</option>
          <option value={60}>1 hour+</option>
          <option value={90}>1.5 hours+</option>
          <option value={120}>2 hours+</option>
          <option value={180}>3 hours+</option>
        </select>
      </div>
    </div>
  );
};
