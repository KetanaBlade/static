import React, { useState, useMemo, useCallback } from 'react';
import { DAYS_OF_WEEK, HOURS_PER_DAY, SLOTS_PER_HOUR, TOTAL_SLOTS_PER_WEEK, SLOTS_PER_DAY } from '../../lib/constants';
import { formatSlotTime } from '../../lib/timezone';
import { computeHeatmapMatrix } from '../../lib/overlap';
import { GroupMember } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Layers, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';

interface OverlapHeatmapProps {
  members: GroupMember[];
  viewerTimezone: string;
  timeFormat?: '12h' | '24h';
  highlightedMemberId?: string | null;
  minRatioFilter: number;
}

interface HoverTooltipState {
  x: number;
  y: number;
  dayName: string;
  timeLabel: string;
  count: number;
  ratio: number;
  availableMembers: { id: string; name: string }[];
  unavailableMembers: { id: string; name: string }[];
}

export const OverlapHeatmap: React.FC<OverlapHeatmapProps> = React.memo(({
  members,
  viewerTimezone,
  timeFormat = '12h',
  highlightedMemberId,
  minRatioFilter,
}) => {
  const totalMembers = members.length;
  const [hoverInfo, setHoverInfo] = useState<HoverTooltipState | null>(null);

  const rawMatrix = useMemo(() => computeHeatmapMatrix(members), [members]);

  // Transform matrix into viewer's local time slots
  const localMatrix = useMemo(() => {
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

  const getCellColorClass = useCallback((ratio: number, count: number, isHighlightedMemberAvailable?: boolean) => {
    if (highlightedMemberId) {
      if (isHighlightedMemberAvailable) {
        return 'bg-primary text-primary-foreground font-semibold shadow-inner';
      }
      return 'bg-muted/10 opacity-30';
    }

    if (count === 0 || ratio === 0) return 'bg-transparent hover:bg-muted/40';
    if (ratio >= minRatioFilter) return 'bg-emerald-500 text-emerald-950 font-bold shadow-xs';
    return 'bg-neutral-300 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300 opacity-80'; // Darker gray for selected but non-overlapping
  }, [highlightedMemberId, minRatioFilter]);

  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleCellMouseEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    dayName: string,
    timeLabel: string,
    data: { count: number; ratio: number; availableMembers: { id: string; name: string }[]; unavailableMembers: { id: string; name: string }[] }
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverInfo({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      dayName,
      timeLabel,
      count: data.count,
      ratio: data.ratio,
      availableMembers: data.availableMembers,
      unavailableMembers: data.unavailableMembers,
    });
  };

  const handleCellMouseLeave = () => {
    setHoverInfo(null);
  };

  return (
    <Card className="border border-border bg-card shadow-sm rounded-lg relative overflow-hidden transition-all">
      <CardHeader 
        className="p-5 sm:p-6 cursor-pointer hover:bg-muted/30 transition-colors select-none flex flex-row items-center justify-between border-b border-border/40"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-primary" />
          <div>
            <CardTitle className="text-lg font-bold tracking-tight text-foreground">
              Group Availability Chart
            </CardTitle>
            {!isCollapsed && (
              <CardDescription className="text-sm font-medium text-muted-foreground mt-1">
                See the exact schedule overlaps for your group (in your timezone).
              </CardDescription>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {!isCollapsed && (
            <div className="hidden sm:flex items-center gap-3 text-xs font-bold tracking-tight text-muted-foreground mr-2">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-sm bg-neutral-300 dark:bg-neutral-600 opacity-80" />
                <span>Some Free</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-sm bg-emerald-500 shadow-xs" />
                <span className="text-foreground">Match ({Math.round(minRatioFilter * 100)}%+)</span>
              </div>
            </div>
          )}
          <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`} />
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="p-6 sm:p-7 pt-6">
        <div className="border border-border rounded-lg bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[680px]">
              {/* Sticky Day Headers */}
            <div className="grid grid-cols-[100px_repeat(7,1fr)] sticky top-0 z-20 bg-card border-b border-border text-sm font-semibold">
              <div className="p-3 text-center text-muted-foreground border-r border-border/60 flex items-center justify-center bg-card">
                Time
              </div>
              {DAYS_OF_WEEK.map((day) => (
                <div
                  key={day.index}
                  className={`p-3 text-center border-r border-border/60 last:border-r-0 ${
                    day.isWeekend ? 'bg-primary/5 text-primary font-semibold' : 'text-foreground'
                  }`}
                >
                  <div className="font-bold text-sm tracking-tight whitespace-nowrap">{day.shortName}</div>
                </div>
              ))}
            </div>

            {/* Rows (24 Hours) */}
            <div className="divide-y divide-border/40">
              {Array.from({ length: HOURS_PER_DAY }).map((_, hour) => {
                const topSlotInDay = hour * SLOTS_PER_HOUR;
                const bottomSlotInDay = topSlotInDay + 1;
                const timeLabel = formatSlotTime(topSlotInDay, timeFormat);
                const bottomTimeLabel = formatSlotTime(bottomSlotInDay, timeFormat);

                return (
                  <div key={hour} className="grid grid-cols-[100px_repeat(7,1fr)] group hover:bg-muted/10">
                    {/* Time Column */}
                    <div className="p-2 text-center text-xs sm:text-sm font-mono font-medium text-muted-foreground tabular-nums whitespace-nowrap border-r border-border/60 flex items-center justify-center bg-card">
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
                          <div
                            onMouseEnter={(e) => handleCellMouseEnter(e, day.name, timeLabel, topData)}
                            onMouseLeave={handleCellMouseLeave}
                            className={`h-6 border-b border-border/20 cursor-pointer ${getCellColorClass(
                              topData.ratio,
                              topData.count,
                              isTopHighlightedAvailable
                            )}`}
                          />

                          {/* Bottom 30-min slot */}
                          <div
                            onMouseEnter={(e) => handleCellMouseEnter(e, day.name, bottomTimeLabel, bottomData)}
                            onMouseLeave={handleCellMouseLeave}
                            className={`h-6 cursor-pointer ${getCellColorClass(
                              bottomData.ratio,
                              bottomData.count,
                              isBottomHighlightedAvailable
                            )}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        </div>

        {/* Ultra-performant Single Floating Tooltip */}
        {hoverInfo && (
          <div
            style={{
              position: 'fixed',
              left: `${hoverInfo.x}px`,
              top: `${hoverInfo.y}px`,
              transform: 'translate(-50%, -100%)',
              pointerEvents: 'none',
              zIndex: 9999,
            }}
            className="p-3 max-w-xs rounded-xl bg-popover/95 text-popover-foreground border border-border shadow-xl backdrop-blur-md space-y-1.5 text-xs sm:text-sm animate-in fade-in-50 duration-75"
          >
            <div className="font-semibold text-foreground text-sm">
              {hoverInfo.dayName} {hoverInfo.timeLabel}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-primary">
              {hoverInfo.count} of {totalMembers} members available ({Math.round(hoverInfo.ratio * 100)}%)
            </div>
            {hoverInfo.availableMembers.length > 0 && (
              <div className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-start gap-1.5">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Available: {hoverInfo.availableMembers.map((m) => m.name).join(', ')}</span>
              </div>
            )}
            {hoverInfo.unavailableMembers.length > 0 && (
              <div className="text-xs sm:text-sm text-rose-600 dark:text-rose-400 font-medium flex items-start gap-1.5">
                <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Busy: {hoverInfo.unavailableMembers.map((m) => m.name).join(', ')}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
      )}
    </Card>
  );
});
OverlapHeatmap.displayName = 'OverlapHeatmap';
