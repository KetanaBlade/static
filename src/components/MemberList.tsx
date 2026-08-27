import React, { useState } from 'react';
import { getTimezoneAbbreviation } from '../lib/timezone';
import { GroupMember } from '../types';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Users, UserX, Edit3, ShieldAlert, Sparkles } from 'lucide-react';

interface MemberListProps {
  members: GroupMember[];
  currentMemberId?: string | null;
  isCreator: boolean;
  onEditMember: (member: GroupMember) => void;
  onRemoveMember: (memberId: string) => void;
  selectedMemberId?: string | null;
  onSelectMember: (memberId: string | null) => void;
}

export const MemberList: React.FC<MemberListProps> = ({
  members,
  currentMemberId,
  isCreator,
  onEditMember,
  onRemoveMember,
  selectedMemberId,
  onSelectMember,
}) => {
  const [memberToRemove, setMemberToRemove] = useState<GroupMember | null>(null);

  const handleConfirmRemove = () => {
    if (memberToRemove) {
      onRemoveMember(memberToRemove.id);
      setMemberToRemove(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Users className="w-4 h-4 text-primary" />
          Group Members ({members.length})
        </span>
        {isCreator && (
          <Badge variant="secondary" className="text-xs font-mono text-primary font-bold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Group Creator
          </Badge>
        )}
      </div>

      {members.length === 0 ? (
        <div className="text-sm text-muted-foreground italic p-4 rounded-xl border border-dashed text-center">
          No members yet. Add your name and availability below to get started!
        </div>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          {members.map((member) => {
            const isMe = member.id === currentMemberId;
            const isSelected = selectedMemberId === member.id;
            const tzAbbr = getTimezoneAbbreviation(member.timezone);
            const totalHours = (member.slotsUtc.length * 0.5).toFixed(1);

            return (
              <div
                key={member.id}
                className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-xl border text-sm transition-all shadow-xs ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/30 font-bold'
                    : 'border-border bg-card hover:border-primary/40'
                }`}
              >
                {/* Clickable name to filter heatmap */}
                <button
                  type="button"
                  onClick={() => onSelectMember(isSelected ? null : member.id)}
                  title={`Click to filter heatmap for ${member.name}'s schedule`}
                  className="font-bold text-foreground hover:text-primary transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-extrabold flex items-center justify-center">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                  {member.name}
                  {isMe && <span className="text-xs text-muted-foreground font-normal">(You)</span>}
                </button>

                <span className="text-xs font-mono font-bold text-muted-foreground tabular-nums">
                  {tzAbbr} • {totalHours}h
                </span>

                {/* Edit Button for current user */}
                {isMe && (
                  <button
                    type="button"
                    onClick={() => onEditMember(member)}
                    title="Edit my availability"
                    aria-label={`Edit availability for ${member.name}`}
                    className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Remove Button (Visible to creator or for self) */}
                {(isCreator || isMe) && (
                  <button
                    type="button"
                    onClick={() => setMemberToRemove(member)}
                    title={`Remove ${member.name} from group`}
                    aria-label={`Remove ${member.name} from group`}
                    className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog for Member Removal */}
      <Dialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              Remove Member?
            </DialogTitle>
            <DialogDescription className="text-sm pt-2">
              Are you sure you want to remove <strong>{memberToRemove?.name}</strong> from this group? Their weekly availability will be removed from the overlap heatmap.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setMemberToRemove(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirmRemove}>
              Yes, Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
