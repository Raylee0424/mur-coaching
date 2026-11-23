import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ExerciseNotesService } from './exercise-notes.service';

const note = { id: 'n1', clientId: 'c1', exerciseId: 'x1', body: 'Brace harder', createdAt: new Date('2026-11-24T10:00:00Z'), updatedAt: new Date('2026-11-24T10:00:00Z') };

function setup(opts: { visible?: number; owned?: boolean } = {}) {
  const { visible = 1, owned = true } = opts;
  const prisma = {
    coachClient: { findUnique: vi.fn().mockResolvedValue(null) },
    exercise: { count: vi.fn().mockResolvedValue(visible) },
    exerciseNote: {
      findMany: vi.fn().mockResolvedValue([note]),
      findFirst: vi.fn().mockResolvedValue(owned ? { id: 'n1' } : null),
      create: vi.fn().mockResolvedValue(note),
      update: vi.fn().mockResolvedValue(note),
      delete: vi.fn().mockResolvedValue(note),
    },
  };
  return { prisma, service: new ExerciseNotesService(prisma as never) };
}

describe('ExerciseNotesService', () => {
  it('scopes the list to the caller', async () => {
    const { service, prisma } = setup();
    await service.list('c1', 'x1');
    expect(prisma.exerciseNote.findMany.mock.calls[0]?.[0].where).toEqual({ clientId: 'c1', exerciseId: 'x1' });
  });

  it('creates a note for a visible exercise only', async () => {
    const ok = setup();
    expect((await ok.service.create('c1', 'x1', 'Brace harder')).body).toBe('Brace harder');
    const bad = setup({ visible: 0 });
    await expect(bad.service.create('c1', 'nope', 'x')).rejects.toBeInstanceOf(BadRequestException);
    expect(bad.prisma.exerciseNote.create).not.toHaveBeenCalled();
  });

  it("404s when editing or deleting someone else's note", async () => {
    const { service, prisma } = setup({ owned: false });
    await expect(service.update('c2', 'n1', 'x')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('c2', 'n1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.exerciseNote.update).not.toHaveBeenCalled();
    expect(prisma.exerciseNote.delete).not.toHaveBeenCalled();
  });
});
