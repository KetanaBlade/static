import React from 'react';
import { POPULAR_TIMEZONES } from '../../lib/constants';
import { detectUserTimezone, getTimezoneAbbreviation } from '../../lib/timezone';
import { GroupMember } from '../../types';
import { Users, Clock, Globe, RotateCcw, UserCheck, Check, X } from 'lucide-react';

interface OverlapThresholdFilterProps {
  viewerTimezone: string;
  onTimezoneChange: (tz: string) => void;
  minRatio: number;
  onMinRatioChange: (ratio: number) => void;
  minDurationMinutes: number;
  onMinDurationChange: (minutes: number) => void;
  members?: GroupMember[];
  excludedMemberIds?: string[];
  onToggleExcludeMember?: (memberId: string) => void;
  onResetExcludedMembers?: () => void;
}

export const OverlapThresholdFilter: React.FC<OverlapThresholdFilterProps> = ({
  viewerTimezone,
  onTimezoneChange,
  minRatio,
  onMinRatioChange,
  minDurationMinutes,
  onMinDurationChange,
  members = [],
  excludedMemberIds = [],
  onToggleExcludeMember,
  onResetExcludedMembers,
}) => {
  const tzAbbr = getTimezoneAbbreviation(viewerTimezone);

  const handleAutoDetect = () => {
    const detected = detectUserTimezone();
    onTimezoneChange(detected);
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-xs">
      {/* Timezone Selector for Results */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-sm font-semibold text-foreground flex items-center gap-2 shrink-0">
          <Globe className="w-4 h-4 text-primary" />
          Showing Results in:
        </span>
        <div className="flex items-center gap-2 flex-1 sm:flex-none">
          <select
            value={viewerTimezone}
            onChange={(e) => onTimezoneChange(e.target.value)}
            aria-label="Change timezone for results"
            className="h-10 px-3.5 rounded-lg border border-border bg-card text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs cursor-pointer truncate max-w-[280px]"
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
            className="h-10 px-3 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Auto-detect</span>
          </button>
        </div>
      </div>

      {/* Attendance & Duration Filter Controls */}
      <div className="flex flex-wrap items-center gap-4 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/60">
        {/* Who's Free Threshold Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-primary" />
            Who's Free:
          </span>
          <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-xs" role="group" aria-label="Group availability filter">
            <button
              type="button"
              aria-pressed={minRatio === 1.0}
              onClick={() => onMinRatioChange(1.0)}
              className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                minRatio === 1.0
                  ? 'bg-primary text-primary-foreground shadow-xs border border-primary-foreground/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
              }`}
            >
              Everyone (100%)
            </button>
            <button
              type="button"
              aria-pressed={minRatio === 0.75}
              onClick={() => onMinRatioChange(0.75)}
              className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                minRatio === 0.75
                  ? 'bg-primary text-primary-foreground shadow-xs border border-primary-foreground/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
              }`}
            >
              Most (75%+)
            </button>
            <button
              type="button"
              aria-pressed={minRatio === 0.5}
              onClick={() => onMinRatioChange(0.5)}
              className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                minRatio === 0.5
                  ? 'bg-primary text-primary-foreground shadow-xs border border-primary-foreground/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
              }`}
            >
              Any (50%+)
            </button>
          </div>
        </div>

        {/* Minimum Duration Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-primary" />
            Min Length:
          </span>
          <select
            value={minDurationMinutes}
            onChange={(e) => onMinDurationChange(Number(e.target.value))}
            aria-label="Select minimum window duration"
            className="h-9 px-3 rounded-lg border border-border bg-card text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs cursor-pointer"
          >
            <option value={30}>30 mins+</option>
            <option value={60}>1 hour+</option>
            <option value={90}>1.5 hours+</option>
            <option value={120}>2 hours+</option>
            <option value={180}>3 hours+</option>
          </select>
        </div>
      </div>

      {/* Member Filter Chips (Include / Exclude Specific People) */}
      {members.length > 0 && (
        <div className="pt-3.5 mt-1 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold text-muted-foreground flex items-center gap-1.5 shrink-0">
              <UserCheck className="w-3.5 h-3.5 text-primary" />
              Include in Schedule:
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              {members.map((m) => {
                const isExcluded = excludedMemberIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onToggleExcludeMember?.(m.id)}
                    title={isExcluded ? `Click to include ${m.name} in results` : `Click to exclude ${m.name} from results`}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                      isExcluded
                        ? 'bg-muted/40 border border-dashed border-border text-muted-foreground/60 line-through hover:text-foreground hover:border-border/80'
                        : 'bg-card border border-primary/30 text-foreground hover:border-primary shadow-xs ring-1 ring-primary/10'
                    }`}
                  >
                    {isExcluded ? (
                      <X className="w-3 h-3 text-rose-500 shrink-0" />
                    ) : (
                      <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                    )}
                    <span>{m.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {excludedMemberIds.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20">
                {excludedMemberIds.length} excluded
              </span>
              <button
                type="button"
                onClick={onResetExcludedMembers}
                className="text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                Include All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
