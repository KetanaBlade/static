import React, { useState } from 'react';
import { POPULAR_TIMEZONES } from '../../lib/constants';
import { detectUserTimezone, getTimezoneAbbreviation } from '../../lib/timezone';
import { GroupMember, SlotIndex } from '../../types';
import { QuickPresets } from './QuickPresets';
import { RangeBuilder } from './RangeBuilder';
import { WeeklyGridPainter } from './WeeklyGridPainter';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Globe, User, Check, Calendar, ListPlus, Sparkles } from 'lucide-react';

interface AvailabilityManagerProps {
  currentMember?: GroupMember;
  onSaveMember: (name: string, timezone: string, slotsUtc: SlotIndex[]) => void;
  timeFormat?: '12h' | '24h';
}

export const AvailabilityManager: React.FC<AvailabilityManagerProps> = ({
  currentMember,
  onSaveMember,
  timeFormat = '12h',
}) => {
  const [name, setName] = useState<string>(currentMember?.name || '');
  const [timezone, setTimezone] = useState<string>(
    currentMember?.timezone || detectUserTimezone()
  );
  const [slotsUtc, setSlotsUtc] = useState<SlotIndex[]>(
    currentMember?.slotsUtc || []
  );
  const [inputMode, setInputMode] = useState<'grid' | 'ranges'>('grid');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const handleAutoDetectTimezone = () => {
    const detected = detectUserTimezone();
    setTimezone(detected);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveMember(name.trim(), timezone, slotsUtc);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const tzAbbr = getTimezoneAbbreviation(timezone);

  return (
    <Card className="border-primary/20 bg-card shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {currentMember ? `Editing: ${currentMember.name}` : 'Your Weekly Free Time'}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              Select the general recurring days and hours when you are free to hang out.
            </CardDescription>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setInputMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                inputMode === 'grid'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Interactive Grid
            </button>
            <button
              type="button"
              onClick={() => setInputMode('ranges')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                inputMode === 'ranges'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ListPlus className="w-3.5 h-3.5" />
              Time Range Form
            </button>
          </div>
        </div>

        {/* User Identity & Timezone Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border/60">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Your Name / Nickname <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Alex"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-muted-foreground">
                Your Timezone
              </label>
              <button
                type="button"
                onClick={handleAutoDetectTimezone}
                className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Globe className="w-3 h-3" />
                Auto-detect
              </button>
            </div>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value={timezone}>Current: {timezone} ({tzAbbr})</option>
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
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Quick 1-Tap Presets Bar */}
        <QuickPresets
          timezone={timezone}
          currentSlots={slotsUtc}
          onSlotsChange={setSlotsUtc}
        />

        {/* Input Mode View */}
        {inputMode === 'grid' ? (
          <WeeklyGridPainter
            timezone={timezone}
            currentSlots={slotsUtc}
            onSlotsChange={setSlotsUtc}
            timeFormat={timeFormat}
          />
        ) : (
          <RangeBuilder
            timezone={timezone}
            currentSlots={slotsUtc}
            onSlotsChange={setSlotsUtc}
            timeFormat={timeFormat}
          />
        )}

        {/* Submit / Save Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground text-center sm:text-left">
            {slotsUtc.length > 0 ? (
              <span className="text-emerald-500 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                {(slotsUtc.length * 0.5).toFixed(1)} hours of availability ready to sync
              </span>
            ) : (
              'Paint your hours above or tap a preset to get started'
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={!name.trim() || slotsUtc.length === 0}
            variant={isSaved ? 'success' : 'default'}
            className="w-full sm:w-auto h-11 px-8 text-sm font-bold shadow-md"
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Saved & Synced!
              </>
            ) : (
              'Save My Availability'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
