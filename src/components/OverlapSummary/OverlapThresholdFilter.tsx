import React from 'react';
import { POPULAR_TIMEZONES } from '../../lib/constants';
import { detectUserTimezone } from '../../lib/timezone';
import { GroupMember } from '../../types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '../ui/select';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
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
  const handleAutoDetect = () => {
    const detected = detectUserTimezone();
    onTimezoneChange(detected);
  };

  return (
    <div className="rounded-md border border-border/70 bg-muted/20 p-3.5 sm:p-4 space-y-3.5 shadow-2xs">
      {/* ROW 1: Timezone + Attendance + Length Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        {/* Left: Timezone Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5 shrink-0">
            <Globe className="w-3.5 h-3.5 text-primary" />
            Showing in:
          </span>
          <div className="flex items-center gap-1.5">
            <Select value={viewerTimezone} onValueChange={onTimezoneChange}>
              <SelectTrigger className="w-[190px] sm:w-[250px] h-9 text-xs sm:text-sm">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {POPULAR_TIMEZONES.map((group) => (
                  <SelectGroup key={group.group}>
                    <SelectLabel>{group.group}</SelectLabel>
                    {group.timezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>

            <button
              type="button"
              onClick={handleAutoDetect}
              title="Auto-detect my local timezone"
              className="h-9 px-2.5 rounded-md border border-input bg-background/70 hover:bg-background hover:border-muted-foreground/50 text-muted-foreground hover:text-foreground text-xs font-semibold flex items-center gap-1 transition-all shadow-xs cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Auto</span>
            </button>
          </div>
        </div>

        {/* Right: Who's Free & Min Length side-by-side */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs sm:text-sm font-semibold text-muted-foreground flex items-center gap-1 shrink-0">
              <Users className="w-3.5 h-3.5 text-primary" />
              Free:
            </span>
            <Tabs value={minRatio.toString()} onValueChange={(val) => onMinRatioChange(Number(val))}>
              <TabsList className="h-9 p-0.5" aria-label="Group availability filter">
                <TabsTrigger value="1" className="px-2.5 py-1 text-xs">All (100%)</TabsTrigger>
                <TabsTrigger value="0.75" className="px-2.5 py-1 text-xs">Most (75%+)</TabsTrigger>
                <TabsTrigger value="0.5" className="px-2.5 py-1 text-xs">Any (50%+)</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs sm:text-sm font-semibold text-muted-foreground flex items-center gap-1 shrink-0">
              <Clock className="w-3.5 h-3.5 text-primary" />
              Min:
            </span>
            <Select
              value={minDurationMinutes.toString()}
              onValueChange={(val) => onMinDurationChange(Number(val))}
            >
              <SelectTrigger className="w-[110px] sm:w-[120px] h-9 text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 mins</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="180">3 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ROW 2: Member Filter Chips (Include / Exclude Specific People) */}
      {members.length > 0 && (
        <div className="pt-2.5 border-t border-border/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 shrink-0">
              <UserCheck className="w-3.5 h-3.5 text-primary" />
              Include in Results:
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
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-semibold transition-all cursor-pointer ${
                      isExcluded
                        ? 'bg-muted/40 border border-dashed border-border text-muted-foreground/60 line-through hover:text-foreground'
                        : 'bg-card border border-border text-foreground hover:border-primary/50 shadow-2xs'
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
              <span className="font-mono text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-sm border border-amber-500/20">
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
