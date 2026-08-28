import React, { useState, useRef, useEffect, useCallback } from 'react';
import { POPULAR_TIMEZONES } from '../../lib/constants';
import { detectUserTimezone, getTimezoneAbbreviation } from '../../lib/timezone';
import { GroupMember, SlotIndex } from '../../types';
import { QuickPresets } from './QuickPresets';
import { RangeBuilder } from './RangeBuilder';
import { WeeklyGridPainter } from './WeeklyGridPainter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import {
  Globe,
  Check,
  Calendar,
  ListPlus,
  Sparkles,
  UserCheck,
  CircleDot,
  Cloud,
  ChevronDown,
  ChevronUp,
  User,
  ArrowRight,
  Edit2,
} from 'lucide-react';

interface AvailabilityManagerProps {
  currentMember?: GroupMember;
  onSaveMember: (name: string, timezone: string, slotsUtc: SlotIndex[]) => void;
  timeFormat?: '12h' | '24h';
}

function areSlotsEqual(a: SlotIndex[], b: SlotIndex[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  for (const s of b) {
    if (!setA.has(s)) return false;
  }
  return true;
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
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle' | 'needs_name'>('saved');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isEditingIdentity, setIsEditingIdentity] = useState<boolean>(!currentMember?.name);

  // Baseline of what has been successfully saved
  const lastSavedState = useRef<{ name: string; timezone: string; slotsUtc: SlotIndex[] }>({
    name: currentMember?.name || '',
    timezone: currentMember?.timezone || timezone,
    slotsUtc: currentMember?.slotsUtc || [],
  });

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef<boolean>(true);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // When switching member or loading member from outside
  useEffect(() => {
    if (currentMember) {
      setName(currentMember.name);
      setTimezone(currentMember.timezone);
      setSlotsUtc(currentMember.slotsUtc);
      lastSavedState.current = {
        name: currentMember.name,
        timezone: currentMember.timezone,
        slotsUtc: currentMember.slotsUtc,
      };
      setSaveStatus('saved');
      setIsEditingIdentity(false);
    }
  }, [currentMember]);

  const handleAutoDetectTimezone = () => {
    const detected = detectUserTimezone();
    setTimezone(detected);
  };

  // Perform the actual save
  const performSave = useCallback(
    (saveName: string, saveTz: string, saveSlots: SlotIndex[]) => {
      if (!saveName.trim()) {
        setSaveStatus('needs_name');
        return;
      }

      onSaveMember(saveName.trim(), saveTz, saveSlots);
      lastSavedState.current = {
        name: saveName.trim(),
        timezone: saveTz,
        slotsUtc: [...saveSlots],
      };
      setSaveStatus('saved');
    },
    [onSaveMember]
  );

  // Debounced Auto-Save trigger
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const trimmedName = name.trim();
    const hasChanges =
      trimmedName !== lastSavedState.current.name.trim() ||
      timezone !== lastSavedState.current.timezone ||
      !areSlotsEqual(slotsUtc, lastSavedState.current.slotsUtc);

    if (!hasChanges) {
      return;
    }

    if (!trimmedName) {
      setSaveStatus('needs_name');
      return;
    }

    setSaveStatus('saving');

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Auto-save after 400ms debounce
    saveTimerRef.current = setTimeout(() => {
      performSave(name, timezone, slotsUtc);
    }, 400);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [name, timezone, slotsUtc, performSave]);

  const tzAbbr = getTimezoneAbbreviation(timezone);
  const hasValidIdentity = Boolean(name.trim());

  return (
    <Card className="border border-border bg-card/90 backdrop-blur-sm shadow-sm transition-all rounded-lg overflow-hidden">
      <CardHeader className="p-6 pb-4 border-b border-border/40 bg-muted/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <UserCheck className="w-6 h-6 text-primary" />
              {currentMember ? `Your Availability (${currentMember.name})` : 'Your Weekly Availability'}
            </CardTitle>
            <CardDescription className="text-sm sm:text-base text-muted-foreground mt-1 leading-relaxed">
              Select your recurring weekly free hours. Everything translates to your friends' timezones.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            {/* Collapsible Toggle Button */}
            {hasValidIdentity && (
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-colors cursor-pointer shadow-xs"
                title={isCollapsed ? 'Expand Availability Editor' : 'Collapse Availability Editor'}
              >
                {isCollapsed ? (
                  <>
                    <ChevronDown className="w-4 h-4 text-primary" />
                    <span>Expand</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    <span>Collapse</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ================= STEP 1: IDENTITY SECTION ================= */}
        {!isCollapsed && (
          <div className="pt-4">
            {hasValidIdentity && !isEditingIdentity ? (
              /* Compact identity badge when already set */
              <div className="p-3.5 rounded-xl border border-border/80 bg-muted/40 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-sm">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                      <span>{name}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                        Active Profile
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">
                      Timezone: {timezone} ({tzAbbr})
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingIdentity(true)}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-primary/10 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Change Name / Timezone
                </button>
              </div>
            ) : (
              /* Expanded Step 1 Identity Form */
              <div className="p-5 rounded-2xl border-2 border-primary/30 bg-primary/[0.02] space-y-4 shadow-xs">
                <div className="flex items-center gap-2 text-sm font-bold text-primary tracking-wide uppercase">
                  <span>Step 1: Your Identity</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground block mb-1.5">
                      Your Name or Nickname <span className="text-destructive">*</span>
                    </label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      required
                      autoFocus
                      placeholder="e.g. Alex, Jordan, Sean"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-sm sm:text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-semibold text-foreground">
                        Your Timezone
                      </label>
                      <button
                        type="button"
                        onClick={handleAutoDetectTimezone}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        Auto-detect
                      </button>
                    </div>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-sm sm:text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs cursor-pointer"
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

                {isEditingIdentity && hasValidIdentity && (
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => setIsEditingIdentity(false)}
                      className="font-semibold shadow-xs"
                    >
                      Done Setting Profile <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Collapsed summary pill */}
        {isCollapsed && (
          <div className="mt-4 p-3.5 rounded-xl bg-muted/40 border border-border/80 flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">{name}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{timezone} ({tzAbbr})</span>
              <span className="text-muted-foreground">•</span>
              <span className="font-bold text-primary">{(slotsUtc.length * 0.5).toFixed(1)} hrs selected</span>
            </div>
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              Edit schedule →
            </button>
          </div>
        )}
      </CardHeader>

      {/* ================= STEP 2: CHOOSE FREE HOURS ================= */}
      {!isCollapsed && hasValidIdentity && (
        <CardContent className="p-6 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs sm:text-sm font-bold text-muted-foreground tracking-wider uppercase">
              Step 2: Select Your Free Hours
            </div>
            
            {/* Mode Switcher Tabs */}
            <div className="inline-flex rounded-md border border-border bg-card p-0.5 shadow-sm" role="tablist" aria-label="Input mode">
              <button
                type="button"
                role="tab"
                aria-selected={inputMode === 'grid'}
                onClick={() => setInputMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-sm tracking-tight transition-colors cursor-pointer ${
                  inputMode === 'grid'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Grid
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={inputMode === 'ranges'}
                onClick={() => setInputMode('ranges')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-sm tracking-tight transition-colors cursor-pointer ${
                  inputMode === 'ranges'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <ListPlus className="w-3.5 h-3.5" />
                Form
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <QuickPresets
            timezone={timezone}
            currentSlots={slotsUtc}
            onSlotsChange={setSlotsUtc}
          />

          {/* Active Input Mode */}
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

          {/* Bottom Bar: Hours Count & Live Auto-Save Status */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-border/80">
            <div className="text-sm text-muted-foreground font-medium text-center sm:text-left">
              {slotsUtc.length > 0 ? (
                <span className="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  {(slotsUtc.length * 0.5).toFixed(1)} hours of availability selected
                </span>
              ) : (
                'Click or drag slots on the grid above or tap a 1-tap preset'
              )}
            </div>

            {/* Live Auto-Save Status Badge */}
            <div className="flex items-center gap-2">
              {saveStatus === 'saving' && (
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/25 animate-pulse">
                  <CircleDot className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                  Auto-saving changes...
                </span>
              )}

              {saveStatus === 'saved' && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Saved to group
                </span>
              )}

              {saveStatus === 'needs_name' && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-primary/10 text-primary border border-primary/25">
                  <Cloud className="w-3.5 h-3.5 text-primary" />
                  Type your name above to save
                </span>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
