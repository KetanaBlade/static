import React, { useState, useRef, useCallback } from 'react';
import { DAYS_OF_WEEK, HOURS_PER_DAY, SLOTS_PER_HOUR } from '../../lib/constants';
import { formatSlotTime, localToUtcSlot, utcToLocalSlot } from '../../lib/timezone';
import { SlotIndex } from '../../types';
import { Sparkles, MousePointerClick } from 'lucide-react';

interface WeeklyGridPainterProps {
  timezone: string;
  currentSlots: SlotIndex[];
  onSlotsChange: (slots: SlotIndex[]) => void;
  timeFormat?: '12h' | '24h';
}

export const WeeklyGridPainter: React.FC<WeeklyGridPainterProps> = React.memo(({
  timezone,
  currentSlots,
  onSlotsChange,
  timeFormat = '12h',
}) => {
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawMode, setDrawMode] = useState<'select' | 'erase'>('select');
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Set of active local slots for fast lookup: key = `${dayIndex}-${slotInDay}`
  const activeLocalSlots = React.useMemo(() => {
    const set = new Set<string>();
    for (const slot of currentSlots) {
      const { dayIndex, slotInDay } = utcToLocalSlot(slot, timezone);
      set.add(`${dayIndex}-${slotInDay}`);
    }
    return set;
  }, [currentSlots, timezone]);

  const toggleSlot = useCallback(
    (dayIndex: number, slotInDay: number, forceMode?: 'select' | 'erase') => {
      const utcSlot = localToUtcSlot(dayIndex, slotInDay, timezone);
      const isAlreadyActive = currentSlots.includes(utcSlot);
      const mode = forceMode || (isAlreadyActive ? 'erase' : 'select');

      if (mode === 'select' && !isAlreadyActive) {
        onSlotsChange([...currentSlots, utcSlot].sort((a, b) => a - b));
      } else if (mode === 'erase' && isAlreadyActive) {
        onSlotsChange(currentSlots.filter((s) => s !== utcSlot));
      }
    },
    [currentSlots, onSlotsChange, timezone]
  );

  const handleMouseDown = (dayIndex: number, slotInDay: number) => {
    const key = `${dayIndex}-${slotInDay}`;
    const mode = activeLocalSlots.has(key) ? 'erase' : 'select';
    
    setIsDrawing(true);
    setDrawMode(mode);
    toggleSlot(dayIndex, slotInDay, mode);
  };

  const handleMouseEnter = (dayIndex: number, slotInDay: number) => {
    if (!isDrawing) return;
    toggleSlot(dayIndex, slotInDay, drawMode);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  // Touch support for mobile dragging
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDrawing) return;
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!target) return;

    const dayStr = target.getAttribute('data-day');
    const slotStr = target.getAttribute('data-slot');
    if (dayStr !== null && slotStr !== null) {
      const d = parseInt(dayStr, 10);
      const s = parseInt(slotStr, 10);
      toggleSlot(d, s, drawMode);
    }
  };

  const totalHoursSelected = (currentSlots.length * 0.5).toFixed(1);

  return (
    <div
      className="space-y-3 select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Sleek Minimalist Status Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 rounded-xl border border-border bg-card/80 backdrop-blur-sm shadow-xs text-xs sm:text-sm">
        <div className="flex items-center gap-2 font-semibold">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>
            <strong className="text-foreground font-bold">{totalHoursSelected} hrs</strong> selected
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
          <MousePointerClick className="w-3.5 h-3.5 text-primary" />
          <span>Click or drag across the grid to toggle hours</span>
        </div>
      </div>

      {/* 7-Day Interactive Grid (Full 24-Hour Day) */}
      <div
        ref={gridContainerRef}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
        className="overflow-x-auto border border-border rounded-2xl bg-card shadow-xs"
      >
        <div className="min-w-[680px]">
          {/* Day Headers (Sticky Top) */}
          <div className="grid grid-cols-[80px_repeat(7,1fr)] sticky top-0 z-20 bg-card/95 backdrop-blur-md border-b border-border text-sm font-semibold">
            <div className="p-3 text-center text-muted-foreground border-r border-border/60">
              Time
            </div>
            {DAYS_OF_WEEK.map((day) => (
              <div
                key={day.index}
                className={`p-3 text-center border-r border-border/60 last:border-r-0 ${
                  day.isWeekend ? 'bg-primary/5 text-primary' : 'text-foreground'
                }`}
              >
                <div className="font-bold text-sm tracking-tight">{day.shortName}</div>
                <div className="text-[11px] font-medium text-muted-foreground">
                  {day.isWeekend ? 'Weekend' : 'Weekday'}
                </div>
              </div>
            ))}
          </div>

          {/* Hour & Half-Hour Rows */}
          <div className="divide-y divide-border/40">
            {Array.from({ length: HOURS_PER_DAY }).map((_, hour) => {
              const topSlot = hour * SLOTS_PER_HOUR;
              const bottomSlot = topSlot + 1;
              const timeLabel = formatSlotTime(topSlot, timeFormat);

              return (
                <div key={hour} className="grid grid-cols-[80px_repeat(7,1fr)] group hover:bg-muted/10">
                  {/* Time label column */}
                  <div className="p-2 text-center text-xs sm:text-sm font-mono font-medium text-muted-foreground tabular-nums border-r border-border/60 flex items-center justify-center bg-card">
                    {timeLabel}
                  </div>

                  {/* 7 Days Columns for this hour */}
                  {DAYS_OF_WEEK.map((day) => {
                    const topKey = `${day.index}-${topSlot}`;
                    const bottomKey = `${day.index}-${bottomSlot}`;
                    const isTopActive = activeLocalSlots.has(topKey);
                    const isBottomActive = activeLocalSlots.has(bottomKey);

                    return (
                      <div
                        key={day.index}
                        className={`border-r border-border/40 last:border-r-0 flex flex-col ${
                          day.isWeekend ? 'bg-primary/[0.02]' : ''
                        }`}
                      >
                        {/* Top 30-min slot (:00) */}
                        <div
                          data-day={day.index}
                          data-slot={topSlot}
                          onMouseDown={() => handleMouseDown(day.index, topSlot)}
                          onMouseEnter={() => handleMouseEnter(day.index, topSlot)}
                          title={`${day.name} ${formatSlotTime(topSlot, timeFormat)}`}
                          className={`h-6 border-b border-border/20 cursor-pointer transition-colors ${
                            isTopActive
                              ? 'bg-primary text-primary-foreground font-semibold shadow-inner'
                              : 'hover:bg-primary/20'
                          }`}
                        />

                        {/* Bottom 30-min slot (:30) */}
                        <div
                          data-day={day.index}
                          data-slot={bottomSlot}
                          onMouseDown={() => handleMouseDown(day.index, bottomSlot)}
                          onMouseEnter={() => handleMouseEnter(day.index, bottomSlot)}
                          title={`${day.name} ${formatSlotTime(bottomSlot, timeFormat)}`}
                          className={`h-6 cursor-pointer transition-colors ${
                            isBottomActive
                              ? 'bg-primary text-primary-foreground font-semibold shadow-inner'
                              : 'hover:bg-primary/20'
                          }`}
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
  );
});
WeeklyGridPainter.displayName = 'WeeklyGridPainter';
