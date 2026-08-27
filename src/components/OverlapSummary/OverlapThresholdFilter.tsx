import React from 'react';
import { POPULAR_TIMEZONES } from '../../lib/constants';
import { detectUserTimezone, getTimezoneAbbreviation } from '../../lib/timezone';
import { Filter, Clock, Globe, RotateCcw } from 'lucide-react';

interface OverlapThresholdFilterProps {
  viewerTimezone: string;
  onTimezoneChange: (tz: string) => void;
  minRatio: number;
  onMinRatioChange: (ratio: number) => void;
  minDurationMinutes: number;
  onMinDurationChange: (minutes: number) => void;
}

export const OverlapThresholdFilter: React.FC<OverlapThresholdFilterProps> = ({
  viewerTimezone,
  onTimezoneChange,
  minRatio,
  onMinRatioChange,
  minDurationMinutes,
  onMinDurationChange,
}) => {
  const tzAbbr = getTimezoneAbbreviation(viewerTimezone);

  const handleAutoDetect = () => {
    const detected = detectUserTimezone();
    onTimezoneChange(detected);
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5 p-3.5 sm:p-4 rounded-2xl border border-border bg-card shadow-xs">
      {/* Timezone Selector for Results */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-foreground flex items-center gap-1.5 shrink-0">
          <Globe className="w-4 h-4 text-primary" />
          Showing Results in:
        </span>
        <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
          <select
            value={viewerTimezone}
            onChange={(e) => onTimezoneChange(e.target.value)}
            aria-label="Change timezone for results"
            className="h-9 px-3 rounded-lg border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs cursor-pointer truncate max-w-[260px]"
          >
            <option value={viewerTimezone}>
              {viewerTimezone} ({tzAbbr})
            </option>
            {POPULAR_TIMEZONES.map((group) => (
              <optgroup key={group.group} label={group.group}>
                {group.timezones.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <button
            type="button"
            onClick={handleAutoDetect}
            title="Auto-detect my local timezone"
            className="h-9 px-2.5 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Auto-detect</span>
          </button>
        </div>
      </div>

      {/* Attendance & Duration Filter Controls */}
      <div className="flex flex-wrap items-center gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/60">
        {/* Attendance Threshold Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-primary" />
            Attendance:
          </span>
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => onMinRatioChange(1.0)}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                minRatio === 1.0
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              100% Free
            </button>
            <button
              type="button"
              onClick={() => onMinRatioChange(0.75)}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                minRatio === 0.75
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              75%+
            </button>
            <button
              type="button"
              onClick={() => onMinRatioChange(0.5)}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                minRatio === 0.5
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All (50%+)
            </button>
          </div>
        </div>

        {/* Minimum Duration Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-primary" />
            Min Length:
          </span>
          <select
            value={minDurationMinutes}
            onChange={(e) => onMinDurationChange(Number(e.target.value))}
            aria-label="Select minimum window duration"
            className="h-8 px-2.5 rounded-lg border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs cursor-pointer"
          >
            <option value={30}>30 mins+</option>
            <option value={60}>1 hour+</option>
            <option value={90}>1.5 hours+</option>
            <option value={120}>2 hours+</option>
            <option value={180}>3 hours+</option>
          </select>
        </div>
      </div>
    </div>
  );
};
