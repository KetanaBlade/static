import { supabase, isSupabaseConfigured } from './supabase';
import { DEFAULT_GROUP_SETTINGS } from './constants';
import { Group, GroupMember } from '../types';

/**
 * Generates a clean, unique short ID for a group (e.g. "8f2k-9x1a" or standard UUID)
 */
export function generateGroupId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, 13); // Clean 13-character UUID slice e.g. "f47ac10b-58cc"
  }
  return `grp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Creates a new group in Supabase
 */
export async function createGroup(
  name: string,
  adminPin: string,
  description?: string
): Promise<Group> {
  const groupId = generateGroupId();
  const creatorToken = `token-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();

  const newGroup: Group = {
    id: groupId,
    name: name.trim(),
    description: description?.trim() || '',
    adminPin: adminPin.trim(),
    creatorToken,
    settings: { ...DEFAULT_GROUP_SETTINGS },
    members: [],
    createdAt: now,
    updatedAt: now,
  };

  if (!isSupabaseConfigured) {
    return newGroup;
  }

  const { error } = await supabase.from('groups').insert({
    id: newGroup.id,
    name: newGroup.name,
    description: newGroup.description,
    admin_pin: newGroup.adminPin,
    creator_token: newGroup.creatorToken,
    settings: newGroup.settings,
    members: newGroup.members,
    created_at: newGroup.createdAt,
    updated_at: newGroup.updatedAt,
  });

  if (error) {
    console.error('Error creating group in Supabase:', error);
    throw new Error(error.message);
  }

  return newGroup;
}

/**
 * Fetches a group by ID from Supabase
 */
export async function fetchGroup(groupId: string): Promise<Group | null> {
  if (!isSupabaseConfigured || !groupId) return null;

  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single();

  if (error || !data) {
    console.warn(`Group not found with id: ${groupId}`, error?.message);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    adminPin: data.admin_pin,
    creatorToken: data.creator_token,
    settings: data.settings || DEFAULT_GROUP_SETTINGS,
    members: (data.members as GroupMember[]) || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Updates a member's availability or adds a new member to the group
 */
export async function saveMemberAvailability(
  groupId: string,
  member: GroupMember
): Promise<Group | null> {
  const current = await fetchGroup(groupId);
  if (!current) return null;

  const existingIndex = current.members.findIndex(
    (m) => m.id === member.id || m.name.toLowerCase() === member.name.toLowerCase()
  );

  const updatedMembers = [...current.members];
  const now = new Date().toISOString();

  if (existingIndex >= 0) {
    updatedMembers[existingIndex] = {
      ...updatedMembers[existingIndex],
      ...member,
      updatedAt: now,
    };
  } else {
    updatedMembers.push({
      ...member,
      createdAt: now,
      updatedAt: now,
    });
  }

  const { data, error } = await supabase
    .from('groups')
    .update({
      members: updatedMembers,
      updated_at: now,
    })
    .eq('id', groupId)
    .select()
    .single();

  if (error || !data) {
    console.error('Error updating member availability:', error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    adminPin: data.admin_pin,
    creatorToken: data.creator_token,
    settings: data.settings || DEFAULT_GROUP_SETTINGS,
    members: (data.members as GroupMember[]) || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Removes a member from the group
 */
export async function removeMemberFromGroup(
  groupId: string,
  memberId: string
): Promise<Group | null> {
  const current = await fetchGroup(groupId);
  if (!current) return null;

  const updatedMembers = current.members.filter((m) => m.id !== memberId);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('groups')
    .update({
      members: updatedMembers,
      updated_at: now,
    })
    .eq('id', groupId)
    .select()
    .single();

  if (error || !data) {
    console.error('Error removing member:', error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    adminPin: data.admin_pin,
    creatorToken: data.creator_token,
    settings: data.settings || DEFAULT_GROUP_SETTINGS,
    members: (data.members as GroupMember[]) || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Subscribes to real-time changes on a specific group via Supabase WebSockets
 */
export function subscribeToGroup(
  groupId: string,
  onUpdate: (group: Group) => void
): () => void {
  if (!isSupabaseConfigured || !groupId) return () => {};

  const channel = supabase
    .channel(`group-realtime:${groupId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'groups',
        filter: `id=eq.${groupId}`,
      },
      (payload) => {
        if (payload.new && typeof payload.new === 'object') {
          const raw = payload.new as Record<string, unknown>;
          const updatedGroup: Group = {
            id: String(raw.id),
            name: String(raw.name),
            description: raw.description ? String(raw.description) : undefined,
            adminPin: String(raw.admin_pin || '1234'),
            creatorToken: raw.creator_token ? String(raw.creator_token) : undefined,
            settings: (raw.settings as Group['settings']) || DEFAULT_GROUP_SETTINGS,
            members: (raw.members as GroupMember[]) || [],
            createdAt: String(raw.created_at),
            updatedAt: String(raw.updated_at),
          };
          onUpdate(updatedGroup);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
