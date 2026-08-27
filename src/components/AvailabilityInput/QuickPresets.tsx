import React from 'react';
import { QUICK_PRESETS } from '../../lib/constants';
import { timeRangesToUtcSlots } from '../../lib/timezone';
import { SlotIndex } from '../../types';
import { Button } from '../ui/button';
import { Sparkles, Trash2 } from 'lucide-react';

interface QuickPresetsProps {
  timezone: string;
  currentSlots: SlotIndex[];
  onSlotsChange: (slots: SlotIndex[]) => void;
}

export const QuickPresets: React.FC<QuickPresetsProps> = ({
  timezone,
  currentSlots,
  onSlotsChange,
}) => {
  const handleApplyPreset = (presetId: string) => {
    const preset = QUICK_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    const ranges = preset.getRanges();
    const presetSlots = timeRangesToUtcSlots(ranges, timezone);

    // Merge with current slots
    const merged = Array.from(new Set([...currentSlots, ...presetSlots])).sort((a, b) => a - b);
    onSlotsChange(merged);
  };

  const handleClear = () => {
    onSlotsChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Quick 1-Tap Presets
        </span>
        {currentSlots.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            variant="outline"
            size="sm"
            onClick={() => handleApplyPreset(preset.id)}
            className="h-9 text-xs rounded-full border-border/80 hover:border-primary/50 hover:bg-primary/5 transition-all text-left font-medium"
            title={preset.description}
          >
            <span className="text-primary font-bold mr-1.5">+</span>
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
