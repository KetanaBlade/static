import React from 'react';
import { DAYS_OF_WEEK, HOURS_PER_DAY, SLOTS_PER_HOUR, TOTAL_SLOTS_PER_WEEK, SLOTS_PER_DAY } from '../../lib/constants';
import { formatSlotTime } from '../../lib/timezone';
import { computeHeatmapMatrix } from '../../lib/overlap';
import { GroupMember } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Layers, CheckCircle2, XCircle } from 'lucide-react';

interface OverlapHeatmapProps {
  members: GroupMember[];
  viewerTimezone: string;
  timeFormat?: '12h' | '24h';
  highlightedMemberId?: string | null;
}

export const OverlapHeatmap: React.FC<OverlapHeatmapProps> = ({
  members,
  viewerTimezone,
  timeFormat = '12h',
  highlightedMemberId,
}) => {
  const totalMembers = members.length;
  const rawMatrix = React.useMemo(() => computeHeatmapMatrix(members), [members]);

  // Transform matrix into viewer's local time slots
  const localMatrix = React.useMemo(() => {
    const testDate = new Date();
    const utcOffsetMinutes = Math.round(
      (new Date(testDate.toLocaleString('en-US', { timeZone: viewerTimezone })).getTime() -
       new Date(testDate.toLocaleString('en-US', { timeZone: 'UTC' })).getTime()) / 60000
    );
    const offsetSlots = Math.round(utcOffsetMinutes / 30);

    const result = [];
    for (let localSlot = 0; localSlot < TOTAL_SLOTS_PER_WEEK; localSlot++) {
      const utcSlot = (((localSlot - offsetSlots) % TOTAL_SLOTS_PER_WEEK) + TOTAL_SLOTS_PER_WEEK) % TOTAL_SLOTS_PER_WEEK;
      const data = rawMatrix[utcSlot];
      result.push(data);
    }
    return result;
  }, [rawMatrix, viewerTimezone]);

  const getCellColorClass = (ratio: number, count: number, isHighlightedMemberAvailable?: boolean) => {
    if (highlightedMemberId) {
      if (isHighlightedMemberAvailable) {
        return 'bg-primary text-primary-foreground font-semibold shadow-inner';
      }
      return 'bg-muted/10 opacity-30';
    }

    if (count === 0 || ratio === 0) return 'bg-transparent hover:bg-muted/40';
    if (ratio === 1) return 'bg-emerald-500 text-white font-semibold shadow-sm shadow-emerald-500/20';
    if (ratio >= 0.75) return 'bg-emerald-600/80 text-emerald-100 font-medium';
    if (ratio >= 0.5) return 'bg-teal-600/60 text-teal-100';
    return 'bg-teal-900/40 text-teal-300';
  };

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="p-6 sm:p-7 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div>
            <CardTitle className="text-xl sm:text-2xl font-semibold flex items-center gap-2.5 text-foreground">
              <Layers className="w-5 h-5 text-primary" />
              Group Availability Heatmap
            </CardTitle>
            <CardDescription className="text-sm sm:text-base text-muted-foreground mt-1">
              Color intensity represents the percentage of group members free at that time (in your timezone).
            </CardDescription>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-muted-foreground self-start sm:self-auto">
            <span>0%</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 rounded-sm border border-border/80 bg-card" />
              <div className="w-4 h-4 rounded-sm bg-teal-900/40" />
              <div className="w-4 h-4 rounded-sm bg-teal-600/60" />
              <div className="w-4 h-4 rounded-sm bg-emerald-600/80" />
              <div className="w-4 h-4 rounded-sm bg-emerald-500 shadow-xs" />
            </div>
            <span>100% Free</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 sm:p-7 pt-0">
        <TooltipProvider delayDuration={100}>
          <div className="overflow-x-auto border border-border rounded-2xl bg-card shadow-xs">
            <div className="min-w-[680px]">
              {/* Sticky Day Headers */}
              <div className="grid grid-cols-[80px_repeat(7,1fr)] sticky top-0 z-20 bg-card/95 backdrop-blur-md border-b border-border text-sm font-semibold">
                <div className="p-3 text-center text-muted-foreground border-r border-border/60">
                  Time
                </div>
                {DAYS_OF_WEEK.map((day) => (
                  <div
                    key={day.index}
                    className={`p-3 text-center border-r border-border/60 last:border-r-0 ${
                      day.isWeekend ? 'bg-primary/5 text-primary font-semibold' : 'text-foreground'
                    }`}
                  >
                    <div className="font-semibold text-sm">{day.shortName}</div>
                  </div>
                ))}
              </div>

              {/* Rows (24 Hours) */}
              <div className="divide-y divide-border/40">
                {Array.from({ length: HOURS_PER_DAY }).map((_, hour) => {
                  const topSlotInDay = hour * SLOTS_PER_HOUR;
                  const bottomSlotInDay = topSlotInDay + 1;
                  const timeLabel = formatSlotTime(topSlotInDay, timeFormat);

                  return (
                    <div key={hour} className="grid grid-cols-[80px_repeat(7,1fr)] group hover:bg-muted/10">
                      {/* Time Column */}
                      <div className="p-2 text-center text-xs sm:text-sm font-mono font-medium text-muted-foreground tabular-nums border-r border-border/60 flex items-center justify-center bg-card">
                        {timeLabel}
                      </div>

                      {/* 7 Day Columns */}
                      {DAYS_OF_WEEK.map((day) => {
                        const topLocalSlot = (day.index * SLOTS_PER_DAY) + topSlotInDay;
                        const bottomLocalSlot = (day.index * SLOTS_PER_DAY) + bottomSlotInDay;

                        const topData = localMatrix[topLocalSlot] || { count: 0, ratio: 0, availableMembers: [], unavailableMembers: [] };
                        const bottomData = localMatrix[bottomLocalSlot] || { count: 0, ratio: 0, availableMembers: [], unavailableMembers: [] };

                        const isTopHighlightedAvailable = highlightedMemberId
                          ? topData.availableMembers.some((m) => m.id === highlightedMemberId)
                          : false;
                        const isBottomHighlightedAvailable = highlightedMemberId
                          ? bottomData.availableMembers.some((m) => m.id === highlightedMemberId)
                          : false;

                        return (
                          <div
                            key={day.index}
                            className={`border-r border-border/40 last:border-r-0 flex flex-col ${
                              day.isWeekend ? 'bg-primary/[0.02]' : ''
                            }`}
                          >
                            {/* Top 30-min slot */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={`h-6 border-b border-border/20 cursor-pointer transition-colors ${getCellColorClass(
                                    topData.ratio,
                                    topData.count,
                                    isTopHighlightedAvailable
                                  )}`}
                                />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="p-3 max-w-xs space-y-2 text-xs sm:text-sm">
                                <div className="font-semibold text-foreground text-sm">
                                  {day.name} {formatSlotTime(topSlotInDay, timeFormat)}
                                </div>
                                <div className="text-xs sm:text-sm font-semibold text-primary">
                                  {topData.count} of {totalMembers} members available ({Math.round(topData.ratio * 100)}%)
                                </div>
                                {topData.availableMembers.length > 0 && (
                                  <div className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-start gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>Available: {topData.availableMembers.map((m) => m.name).join(', ')}</span>
                                  </div>
                                )}
                                {topData.unavailableMembers.length > 0 && (
                                  <div className="text-xs sm:text-sm text-rose-600 dark:text-rose-400 font-medium flex items-start gap-1.5">
                                    <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>Busy: {topData.unavailableMembers.map((m) => m.name).join(', ')}</span>
                                  </div>
                                )}
                              </TooltipContent>
                            </Tooltip>

                            {/* Bottom 30-min slot */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={`h-6 cursor-pointer transition-colors ${getCellColorClass(
                                    bottomData.ratio,
                                    bottomData.count,
                                    isBottomHighlightedAvailable
                                  )}`}
                                />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="p-3 max-w-xs space-y-2 text-xs sm:text-sm">
                                <div className="font-semibold text-foreground text-sm">
                                  {day.name} {formatSlotTime(bottomSlotInDay, timeFormat)}
                                </div>
                                <div className="text-xs sm:text-sm font-semibold text-primary">
                                  {bottomData.count} of {totalMembers} members available ({Math.round(bottomData.ratio * 100)}%)
                                </div>
                                {bottomData.availableMembers.length > 0 && (
                                  <div className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-start gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>Available: {bottomData.availableMembers.map((m) => m.name).join(', ')}</span>
                                  </div>
                                )}
                                {bottomData.unavailableMembers.length > 0 && (
                                  <div className="text-xs sm:text-sm text-rose-600 dark:text-rose-400 font-medium flex items-start gap-1.5">
                                    <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>Busy: {bottomData.unavailableMembers.map((m) => m.name).join(', ')}</span>
                                  </div>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};
