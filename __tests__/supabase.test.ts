import { describe, it, expect } from 'vitest';
import { createGroup, fetchGroup, saveMemberAvailability, removeMemberFromGroup } from '../src/lib/groupService';

describe('Supabase Group Service CRUD', () => {
  it('creates, reads, updates, and deletes members in Supabase', async () => {
    // 1. Create Group
    const group = await createGroup('Vitest Test Squad', '9999');
    expect(group.id).toBeDefined();
    expect(group.name).toBe('Vitest Test Squad');
    expect(group.adminPin).toBe('9999');

    // 2. Fetch Group
    const fetched = await fetchGroup(group.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe('Vitest Test Squad');

    // 3. Add Member
    const updated = await saveMemberAvailability(group.id, {
      id: 'test-member-1',
      name: 'Tester',
      timezone: 'America/New_York',
      slotsUtc: [100, 101, 102],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(updated?.members.length).toBe(1);
    expect(updated?.members[0].name).toBe('Tester');

    // 4. Remove Member
    const afterRemoval = await removeMemberFromGroup(group.id, 'test-member-1');
    expect(afterRemoval?.members.length).toBe(0);
  }, 15000);
});
