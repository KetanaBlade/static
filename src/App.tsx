import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_GROUP_SETTINGS } from './lib/constants';
import { detectUserTimezone, timeRangesToUtcSlots } from './lib/timezone';
import { findOverlappingWindows } from './lib/overlap';
import {
  createGroup,
  fetchGroup,
  saveMemberAvailability,
  removeMemberFromGroup,
  subscribeToGroup,
} from './lib/groupService';
import {
  getSavedUserProfile,
  isGroupCreator,
  saveCreatorToken,
  saveUserProfile,
  unlockCreatorWithPin,
} from './lib/storage/localStorage';
import { Group, GroupMember, SlotIndex } from './types';
import { Header } from './components/Header';
import { MemberList } from './components/MemberList';
import { AvailabilityManager } from './components/AvailabilityInput/AvailabilityManager';
import { GoldenWindowsList } from './components/OverlapSummary/GoldenWindowsList';
import { OverlapHeatmap } from './components/OverlapSummary/OverlapHeatmap';
import { OverlapThresholdFilter } from './components/OverlapSummary/OverlapThresholdFilter';
import { ShareLinkModal } from './components/ShareExport/ShareLinkModal';
import { DiscordExportModal } from './components/ShareExport/DiscordExportModal';
import { Button } from './components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './components/ui/dialog';
import { Sparkles, Layers, KeyRound, Radio } from 'lucide-react';

// Sample pre-populated group for instant demo if fresh visit
const createSampleDemoGroup = (): Group => {
  const creatorToken = 'demo-creator-token';
  const group: Group = {
    id: 'demo-squad',
    name: 'Weekend Gaming & Catch-up Squad',
    description: 'Coordinating hangout times across US and Europe',
    creatorToken,
    adminPin: '1234',
    settings: { ...DEFAULT_GROUP_SETTINGS },
    members: [
      {
        id: 'member-1',
        name: 'Alex (PST)',
        timezone: 'America/Los_Angeles',
        slotsUtc: timeRangesToUtcSlots(
          [
            { day: 5, startHour: 11, startMinute: 0, endHour: 16, endMinute: 0 }, // Sat 11am-4pm
            { day: 6, startHour: 11, startMinute: 0, endHour: 15, endMinute: 0 }, // Sun 11am-3pm
          ],
          'America/Los_Angeles'
        ),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'member-2',
        name: 'Jordan (CST)',
        timezone: 'America/Chicago',
        slotsUtc: timeRangesToUtcSlots(
          [
            { day: 5, startHour: 13, startMinute: 0, endHour: 18, endMinute: 0 }, // Sat 1pm-6pm
            { day: 6, startHour: 13, startMinute: 0, endHour: 17, endMinute: 0 }, // Sun 1pm-5pm
          ],
          'America/Chicago'
        ),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'member-3',
        name: 'Taylor (EST)',
        timezone: 'America/New_York',
        slotsUtc: timeRangesToUtcSlots(
          [
            { day: 5, startHour: 14, startMinute: 0, endHour: 19, endMinute: 0 }, // Sat 2pm-7pm
            { day: 6, startHour: 14, startMinute: 0, endHour: 18, endMinute: 0 }, // Sun 2pm-6pm
          ],
          'America/New_York'
        ),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'member-4',
        name: 'Sean (Ireland)',
        timezone: 'Europe/Dublin',
        slotsUtc: timeRangesToUtcSlots(
          [
            { day: 5, startHour: 19, startMinute: 0, endHour: 23, endMinute: 30 }, // Sat 7pm-11:30pm
            { day: 6, startHour: 19, startMinute: 0, endHour: 23, endMinute: 0 },  // Sun 7pm-11pm
          ],
          'Europe/Dublin'
        ),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveCreatorToken(group.id, creatorToken);
  return group;
};

export const App: React.FC = () => {
  // Theme & Viewer settings - Default to clean light mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [viewerTimezone, setViewerTimezone] = useState<string>(detectUserTimezone());
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  
  // Group state
  const [group, setGroup] = useState<Group | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [selectedFilterMemberId, setSelectedFilterMemberId] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<GroupMember | undefined>(undefined);

  // Filters & Modals - Default to 100% attendance & 2+ hours min length
  const [minRatioFilter, setMinRatioFilter] = useState<number>(1.0);
  const [minDurationMinutes, setMinDurationMinutes] = useState<number>(120);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isDiscordModalOpen, setIsDiscordModalOpen] = useState<boolean>(false);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState<boolean>(false);
  const [newGroupNameInput, setNewGroupNameInput] = useState<string>('');
  const [newGroupPinInput, setNewGroupPinInput] = useState<string>(() =>
    Math.floor(1000 + Math.random() * 9000).toString()
  );

  // Force re-render on unlock
  const [, setAuthTick] = useState<number>(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Load Group on Mount (from ?g=<groupId> or fallback demo)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const groupId = urlParams.get('g');

    const init = async () => {
      if (groupId) {
        try {
          const cloudGroup = await fetchGroup(groupId);
          if (cloudGroup) {
            setGroup(cloudGroup);
            setIsRealtimeConnected(true);

            // Subscribe to live WebSocket changes
            if (unsubscribeRef.current) unsubscribeRef.current();
            unsubscribeRef.current = subscribeToGroup(cloudGroup.id, (updated) => {
              setGroup(updated);
            });
            return;
          }
        } catch (err) {
          console.warn('Could not fetch cloud group, falling back to demo', err);
        }
      }

      // Fallback demo squad
      const initialGroup = createSampleDemoGroup();
      setGroup(initialGroup);
    };

    init();

    const savedUser = getSavedUserProfile();
    if (savedUser) {
      setViewerTimezone(savedUser.timezone);
    }

    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, []);

  // Toggle Dark Mode
  const handleToggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Save / Add Member
  const handleSaveMember = async (name: string, timezone: string, slotsUtc: SlotIndex[]) => {
    if (!group) return;

    saveUserProfile({ name, timezone });
    setViewerTimezone(timezone);

    const now = new Date().toISOString();
    const existingIndex = group.members.findIndex(
      (m) => m.id === currentMemberId || m.name.toLowerCase() === name.toLowerCase()
    );

    const targetMemberId = existingIndex >= 0 ? group.members[existingIndex].id : `member-${Date.now()}`;
    const targetMember: GroupMember = {
      id: targetMemberId,
      name,
      timezone,
      slotsUtc,
      createdAt: existingIndex >= 0 ? group.members[existingIndex].createdAt : now,
      updatedAt: now,
    };

    setCurrentMemberId(targetMember.id);
    setEditingMember(undefined);

    // Optimistically update local state immediately
    const updatedMembers = [...group.members];
    if (existingIndex >= 0) {
      updatedMembers[existingIndex] = targetMember;
    } else {
      updatedMembers.push(targetMember);
    }
    const updatedGroup = { ...group, members: updatedMembers, updatedAt: now };
    setGroup(updatedGroup);

    // Sync to Supabase Cloud
    if (group.id !== 'demo-squad') {
      try {
        const synced = await saveMemberAvailability(group.id, targetMember);
        if (synced) setGroup(synced);
      } catch (err) {
        console.error('Failed to sync availability to cloud:', err);
      }
    }
  };

  // Remove Member
  const handleRemoveMember = async (memberId: string) => {
    if (!group) return;

    const updatedMembers = group.members.filter((m) => m.id !== memberId);
    if (currentMemberId === memberId) {
      setCurrentMemberId(null);
      setEditingMember(undefined);
    }
    const updatedGroup = { ...group, members: updatedMembers, updatedAt: new Date().toISOString() };
    setGroup(updatedGroup);

    // Sync removal to Supabase Cloud
    if (group.id !== 'demo-squad') {
      try {
        const synced = await removeMemberFromGroup(group.id, memberId);
        if (synced) setGroup(synced);
      } catch (err) {
        console.error('Failed to remove member from cloud:', err);
      }
    }
  };

  // Create New Group
  const handleCreateNewGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupNameInput.trim()) return;

    const pin = newGroupPinInput.trim() || Math.floor(1000 + Math.random() * 9000).toString();

    try {
      const newGroup = await createGroup(newGroupNameInput.trim(), pin);
      saveCreatorToken(newGroup.id, newGroup.creatorToken || '');
      setGroup(newGroup);
      setIsRealtimeConnected(true);

      // Clean permanent URL
      const newUrl = `${window.location.origin}${window.location.pathname}?g=${newGroup.id}`;
      window.history.pushState(null, '', newUrl);

      // Subscribe to real-time updates for this new group
      if (unsubscribeRef.current) unsubscribeRef.current();
      unsubscribeRef.current = subscribeToGroup(newGroup.id, (updated) => {
        setGroup(updated);
      });

      setCurrentMemberId(null);
      setEditingMember(undefined);
      setIsNewGroupModalOpen(false);
      setNewGroupNameInput('');
      setNewGroupPinInput(Math.floor(1000 + Math.random() * 9000).toString());
    } catch (err) {
      console.error('Failed to create group in cloud:', err);
      alert('Could not create group. Please verify database table setup.');
    }
  };

  const handleUnlockWithPin = (enteredPin: string): boolean => {
    if (!group) return false;
    const success = unlockCreatorWithPin(group, enteredPin);
    if (success) {
      setAuthTick((prev) => prev + 1);
    }
    return success;
  };

  // Calculate Overlapping Windows
  const overlappingWindows = React.useMemo(() => {
    if (!group || group.members.length === 0) return [];
    return findOverlappingWindows(group.members, viewerTimezone, {
      ...group.settings,
      timeFormat,
      minDurationMinutes,
    });
  }, [group, viewerTimezone, timeFormat, minDurationMinutes]);

  const isCreator = group ? isGroupCreator(group.id, group.creatorToken) : false;
  const currentMember = group?.members.find((m) => m.id === currentMemberId) || editingMember;

  // Clean Share URL: e.g. https://static.vercel.app/?g=8f2k-9x1a
  const cleanShareUrl = group
    ? `${window.location.origin}${window.location.pathname}?g=${group.id}`
    : window.location.href;

  if (!group) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/20">
      {/* Navigation Header */}
      <Header
        groupName={group.name}
        timeFormat={timeFormat}
        onTimeFormatToggle={() => setTimeFormat((prev) => (prev === '12h' ? '24h' : '12h'))}
        isDarkMode={isDarkMode}
        onDarkModeToggle={handleToggleDarkMode}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenDiscordModal={() => setIsDiscordModalOpen(true)}
        onNewGroup={() => setIsNewGroupModalOpen(true)}
      />

      {/* Main Content Dashboard (Top-to-Bottom Scannable Flow) */}
      <main className="flex-1 container mx-auto max-w-5xl px-4 py-8 space-y-8">
        
        {/* Group Header & Member List Strip */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                  {group.name}
                </h1>
                {isRealtimeConnected && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                    <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                    Live Cloud Sync
                  </span>
                )}
              </div>
              <p className="text-base text-muted-foreground mt-1">
                Find recurring weekly meeting windows where everyone's schedule overlaps.
              </p>
            </div>
          </div>

          <MemberList
            members={group.members}
            currentMemberId={currentMemberId}
            isCreator={isCreator}
            adminPin={group.adminPin}
            onEditMember={(m) => {
              setEditingMember(m);
              setCurrentMemberId(m.id);
            }}
            onRemoveMember={handleRemoveMember}
            selectedMemberId={selectedFilterMemberId}
            onSelectMember={setSelectedFilterMemberId}
            onUnlockWithPin={handleUnlockWithPin}
          />
        </div>

        {/* SECTION 1: TOP ENTRY (Your Weekly Availability) */}
        <section aria-labelledby="section-availability">
          <AvailabilityManager
            key={currentMember?.id || 'new'}
            currentMember={currentMember}
            onSaveMember={handleSaveMember}
            timeFormat={timeFormat}
          />
        </section>

        {/* SECTION 2: RESULTS & GROUP OVERLAP */}
        <section aria-labelledby="section-results" className="space-y-6 pt-4 border-t border-border">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-primary" />
              Group Overlap Results
            </h2>
            <p className="text-base text-muted-foreground mt-1">
              The optimal meeting windows where members' schedules align across timezones.
            </p>
          </div>

          {/* Filter & Threshold Bar with Timezone Selector */}
          <OverlapThresholdFilter
            viewerTimezone={viewerTimezone}
            onTimezoneChange={setViewerTimezone}
            minRatio={minRatioFilter}
            onMinRatioChange={setMinRatioFilter}
            minDurationMinutes={minDurationMinutes}
            onMinDurationChange={setMinDurationMinutes}
          />

          {/* Ranked Best Hangout Times (Large, Scannable Cards) */}
          <GoldenWindowsList
            windows={overlappingWindows}
            groupName={group.name}
            viewerTimezone={viewerTimezone}
            minRatioFilter={minRatioFilter}
          />

          {/* Master Visual Heatmap */}
          <div className="pt-4">
            <OverlapHeatmap
              members={group.members}
              viewerTimezone={viewerTimezone}
              timeFormat={timeFormat}
              highlightedMemberId={selectedFilterMemberId}
            />
          </div>
        </section>
      </main>

      {/* Modals */}
      <ShareLinkModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        groupName={group.name}
        shareUrl={cleanShareUrl}
        adminPin={group.adminPin}
      />

      <DiscordExportModal
        isOpen={isDiscordModalOpen}
        onClose={() => setIsDiscordModalOpen(false)}
        groupName={group.name}
        windows={overlappingWindows}
        shareUrl={cleanShareUrl}
      />

      {/* Create New Group Modal */}
      <Dialog open={isNewGroupModalOpen} onOpenChange={setIsNewGroupModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreateNewGroup}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Create New Group Schedule
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground pt-1">
                Name your group and choose a 4-digit Admin PIN to manage members.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-1.5">
                  Group Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Arcadion"
                  value={newGroupNameInput}
                  onChange={(e) => setNewGroupNameInput(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground block mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-primary" />
                  Organizer 4-Digit Admin PIN
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="4-digit PIN"
                  value={newGroupPinInput}
                  onChange={(e) => setNewGroupPinInput(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-border bg-background font-mono text-sm font-semibold tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Save this PIN to moderate members if you open the link on another device.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsNewGroupModalOpen(false)} className="font-semibold">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!newGroupNameInput.trim() || !newGroupPinInput.trim()} className="font-semibold">
                Create Live Group
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
