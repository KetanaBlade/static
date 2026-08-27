import React, { useState, useEffect } from 'react';
import { DEFAULT_GROUP_SETTINGS } from './lib/constants';
import { detectUserTimezone, timeRangesToUtcSlots } from './lib/timezone';
import { findOverlappingWindows } from './lib/overlap';
import { decodeGroupFromUrl, encodeGroupToUrl } from './lib/storage/urlStorage';
import {
  getSavedUserProfile,
  isGroupCreator,
  saveCreatorToken,
  saveUserProfile,
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
import { Sparkles, Plus } from 'lucide-react';

// Sample pre-populated group for instant demo if fresh visit
const createSampleDemoGroup = (): Group => {
  const creatorToken = 'demo-creator-token';
  const group: Group = {
    id: 'demo-squad',
    name: 'Weekend Gaming & Catch-up Squad',
    description: 'Coordinating hangout times across US and Europe',
    creatorToken,
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
  // Theme & Viewer settings
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [viewerTimezone, setViewerTimezone] = useState<string>(detectUserTimezone());
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  
  // Group state
  const [group, setGroup] = useState<Group | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [selectedFilterMemberId, setSelectedFilterMemberId] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<GroupMember | undefined>(undefined);

  // Filters & Modals
  const [minRatioFilter, setMinRatioFilter] = useState<number>(0.5);
  const [minDurationMinutes, setMinDurationMinutes] = useState<number>(60);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isDiscordModalOpen, setIsDiscordModalOpen] = useState<boolean>(false);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState<boolean>(false);
  const [newGroupNameInput, setNewGroupNameInput] = useState<string>('');

  // Initial load from URL Hash or localStorage
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#g=')) {
      const encoded = hash.slice(3);
      const decoded = decodeGroupFromUrl(encoded);
      if (decoded) {
        setGroup(decoded);
        return;
      }
    }

    // Default to sample demo squad
    const initialGroup = createSampleDemoGroup();
    setGroup(initialGroup);
    
    const savedUser = getSavedUserProfile();
    if (savedUser) {
      setViewerTimezone(savedUser.timezone);
    }
  }, []);

  // Sync group changes to URL hash
  const updateGroup = (updated: Group) => {
    setGroup(updated);
    const encoded = encodeGroupToUrl(updated);
    if (encoded) {
      window.history.replaceState(null, '', `#g=${encoded}`);
    }
  };

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
  const handleSaveMember = (name: string, timezone: string, slotsUtc: SlotIndex[]) => {
    if (!group) return;

    saveUserProfile({ name, timezone });
    setViewerTimezone(timezone);

    const now = new Date().toISOString();
    const existingIndex = group.members.findIndex(
      (m) => m.id === currentMemberId || m.name.toLowerCase() === name.toLowerCase()
    );

    let updatedMembers = [...group.members];

    if (existingIndex >= 0) {
      const updatedMember: GroupMember = {
        ...updatedMembers[existingIndex],
        name,
        timezone,
        slotsUtc,
        updatedAt: now,
      };
      updatedMembers[existingIndex] = updatedMember;
      setCurrentMemberId(updatedMember.id);
    } else {
      const newMember: GroupMember = {
        id: `member-${Date.now()}`,
        name,
        timezone,
        slotsUtc,
        createdAt: now,
        updatedAt: now,
      };
      updatedMembers.push(newMember);
      setCurrentMemberId(newMember.id);
    }

    updateGroup({
      ...group,
      members: updatedMembers,
      updatedAt: now,
    });
    setEditingMember(undefined);
  };

  // Remove Member
  const handleRemoveMember = (memberId: string) => {
    if (!group) return;
    const updatedMembers = group.members.filter((m) => m.id !== memberId);
    if (currentMemberId === memberId) {
      setCurrentMemberId(null);
      setEditingMember(undefined);
    }
    updateGroup({
      ...group,
      members: updatedMembers,
      updatedAt: new Date().toISOString(),
    });
  };

  // Create New Group
  const handleCreateNewGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupNameInput.trim()) return;

    const creatorToken = `token-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newGroup: Group = {
      id: `group-${Date.now()}`,
      name: newGroupNameInput.trim(),
      creatorToken,
      settings: { ...DEFAULT_GROUP_SETTINGS },
      members: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveCreatorToken(newGroup.id, creatorToken);
    updateGroup(newGroup);
    setCurrentMemberId(null);
    setEditingMember(undefined);
    setIsNewGroupModalOpen(false);
    setNewGroupNameInput('');
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

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  if (!group) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/20">
      {/* Navigation Header */}
      <Header
        groupName={group.name}
        viewerTimezone={viewerTimezone}
        onTimezoneChange={setViewerTimezone}
        timeFormat={timeFormat}
        onTimeFormatToggle={() => setTimeFormat((prev) => (prev === '12h' ? '24h' : '12h'))}
        isDarkMode={isDarkMode}
        onDarkModeToggle={handleToggleDarkMode}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenDiscordModal={() => setIsDiscordModalOpen(true)}
        onNewGroup={() => setIsNewGroupModalOpen(true)}
      />

      {/* Main Content Dashboard */}
      <main className="flex-1 container mx-auto max-w-7xl px-4 py-6 space-y-6">
        {/* Top Bar: Member Badges & Quick Stats */}
        <div className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                {group.name}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Find the ideal weekly hangout windows where everyone overlaps, normalized across your timezones.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNewGroupModalOpen(true)}
              className="text-xs font-semibold self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Group Schedule
            </Button>
          </div>

          <MemberList
            members={group.members}
            currentMemberId={currentMemberId}
            isCreator={isCreator}
            onEditMember={(m) => {
              setEditingMember(m);
              setCurrentMemberId(m.id);
            }}
            onRemoveMember={handleRemoveMember}
            selectedMemberId={selectedFilterMemberId}
            onSelectMember={setSelectedFilterMemberId}
          />
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Your Availability (Grid + Presets + Form) */}
          <div className="lg:col-span-5 space-y-6">
            <AvailabilityManager
              key={currentMember?.id || 'new'}
              currentMember={currentMember}
              onSaveMember={handleSaveMember}
              timeFormat={timeFormat}
            />
          </div>

          {/* Right Column: Heatmap & Golden Windows Overlap */}
          <div className="lg:col-span-7 space-y-6">
            {/* Filter controls */}
            <OverlapThresholdFilter
              minRatio={minRatioFilter}
              onMinRatioChange={setMinRatioFilter}
              minDurationMinutes={minDurationMinutes}
              onMinDurationChange={setMinDurationMinutes}
            />

            {/* Ranked Golden Windows Breakdown */}
            <GoldenWindowsList
              windows={overlappingWindows}
              groupName={group.name}
              minRatioFilter={minRatioFilter}
            />

            {/* Interactive Group Heatmap */}
            <OverlapHeatmap
              members={group.members}
              viewerTimezone={viewerTimezone}
              timeFormat={timeFormat}
              highlightedMemberId={selectedFilterMemberId}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      <ShareLinkModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        groupName={group.name}
        shareUrl={currentUrl}
      />

      <DiscordExportModal
        isOpen={isDiscordModalOpen}
        onClose={() => setIsDiscordModalOpen(false)}
        groupName={group.name}
        windows={overlappingWindows}
        shareUrl={currentUrl}
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
              <DialogDescription className="text-xs sm:text-sm">
                Enter a name for your group (e.g. "DnD Campaign", "Friday Gaming", "Book Club").
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Group Name
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Weekend Hangouts"
                value={newGroupNameInput}
                onChange={(e) => setNewGroupNameInput(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsNewGroupModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!newGroupNameInput.trim()}>
                Create Group
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
