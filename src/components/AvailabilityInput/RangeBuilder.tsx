import React, { useState } from 'react';
import { DAYS_OF_WEEK } from '../../lib/constants';
import { formatSlotTime, timeRangesToUtcSlots, utcSlotsToTimeRanges } from '../../lib/timezone';
import { SlotIndex, TimeRange } from '../../types';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Clock, Plus, X } from 'lucide-react';

interface RangeBuilderProps {
  timezone: string;
  currentSlots: SlotIndex[];
  onSlotsChange: (slots: SlotIndex[]) => void;
  timeFormat?: '12h' | '24h';
}

export const RangeBuilder: React.FC<RangeBuilderProps> = ({
  timezone,
  currentSlots,
  onSlotsChange,
  timeFormat = '12h',
}) => {
  const [selectedDay, setSelectedDay] = useState<number>(5); // Default: Saturday
  const [startSlotInDay, setStartSlotInDay] = useState<number>(24); // Default: 12:00 PM (slot 24)
  const [endSlotInDay, setEndSlotInDay] = useState<number>(34); // Default: 5:00 PM (slot 34)

  // Time options for dropdowns (48 slots = every 30 mins)
  const timeOptions = React.useMemo(() => {
    return Array.from({ length: 49 }, (_, i) => ({
      slot: i,
      label: i === 48 ? '12:00 AM (Next Day)' : formatSlotTime(i, timeFormat),
    }));
  }, [timeFormat]);

  // Derive active time ranges from current slots in local timezone
  const activeRanges = React.useMemo(() => {
    return utcSlotsToTimeRanges(currentSlots, timezone);
  }, [currentSlots, timezone]);

  const handleAddRange = () => {
    if (endSlotInDay <= startSlotInDay) return;

    const startHour = Math.floor(startSlotInDay / 2);
    const startMinute = (startSlotInDay % 2) * 30;
    const endHour = Math.floor(endSlotInDay / 2);
    const endMinute = (endSlotInDay % 2) * 30;

    const newRange: TimeRange = {
      day: selectedDay,
      startHour,
      startMinute,
      endHour,
      endMinute,
    };

    const newSlots = timeRangesToUtcSlots([newRange], timezone);
    const merged = Array.from(new Set([...currentSlots, ...newSlots])).sort((a, b) => a - b);
    onSlotsChange(merged);
  };

  const handleRemoveRange = (rangeToRemove: TimeRange) => {
    const slotsToRemove = timeRangesToUtcSlots([rangeToRemove], timezone);
    const slotsToRemoveSet = new Set(slotsToRemove);
    const remaining = currentSlots.filter((slot) => !slotsToRemoveSet.has(slot));
    onSlotsChange(remaining);
  };

  return (
    <div className="space-y-4">
      {/* Range Input Controls */}
      <div className="p-4 sm:p-5 rounded-lg border border-border bg-card shadow-xs space-y-4">
        <div className="text-sm font-bold text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Add Custom Time Range
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Day selector */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1.5">Day of Week</label>
            <Select
              value={selectedDay.toString()}
              onValueChange={(val) => setSelectedDay(Number(val))}
            >
              <SelectTrigger className="w-full h-10 text-sm">
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map((day) => (
                  <SelectItem key={day.index} value={day.index.toString()}>
                    {day.name} {day.isWeekend ? '🌟' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Time */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1.5">From</label>
            <Select
              value={startSlotInDay.toString()}
              onValueChange={(val) => {
                const num = Number(val);
                setStartSlotInDay(num);
                if (endSlotInDay <= num) {
                  setEndSlotInDay(Math.min(48, num + 4));
                }
              }}
            >
              <SelectTrigger className="w-full h-10 text-sm tabular-nums">
                <SelectValue placeholder="Start time" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {timeOptions.slice(0, 48).map((opt) => (
                  <SelectItem key={opt.slot} value={opt.slot.toString()}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* End Time */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1.5">To</label>
            <Select
              value={endSlotInDay.toString()}
              onValueChange={(val) => setEndSlotInDay(Number(val))}
            >
              <SelectTrigger className="w-full h-10 text-sm tabular-nums">
                <SelectValue placeholder="End time" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {timeOptions
                  .filter((opt) => opt.slot > startSlotInDay)
                  .map((opt) => (
                    <SelectItem key={opt.slot} value={opt.slot.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleAddRange}
          className="w-full sm:w-auto h-10 px-5 text-xs font-bold mt-1 shadow-xs cursor-pointer"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add This Window
        </Button>
      </div>

      {/* Active Range Chips */}
      {activeRanges.length > 0 && (
        <div className="space-y-2.5">
          <div className="text-sm font-semibold text-muted-foreground">
            Your Active Windows ({activeRanges.length}):
          </div>
          <div className="flex flex-wrap gap-2.5">
            {activeRanges.map((range, idx) => {
              const dayName = DAYS_OF_WEEK[range.day]?.shortName || 'Day';
              const startSlot = (range.startHour * 2) + (range.startMinute >= 30 ? 1 : 0);
              const endSlot = (range.endHour * 2) + (range.endMinute >= 30 ? 1 : 0);
              const startFormatted = formatSlotTime(startSlot, timeFormat);
              const endFormatted = endSlot === 48 ? '12:00 AM' : formatSlotTime(endSlot, timeFormat);
              const durationHours = ((endSlot - startSlot) / 2).toFixed((endSlot - startSlot) % 2 === 0 ? 0 : 1);

              return (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="pl-3.5 pr-2 py-1.5 text-sm font-medium flex items-center gap-2 bg-card border-border shadow-xs"
                >
                  <span className="font-semibold text-foreground">{dayName}</span>
                  <span className="tabular-nums font-mono text-muted-foreground">
                    {startFormatted} – {endFormatted} ({durationHours}h)
                  </span>
                  <button
                    onClick={() => handleRemoveRange(range)}
                    aria-label={`Remove window for ${dayName} ${startFormatted} to ${endFormatted}`}
                    className="ml-1 rounded-sm p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
