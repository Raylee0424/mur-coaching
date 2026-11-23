import { Injectable, NotFoundException } from '@nestjs/common';
import type { ExerciseNote } from '@prisma/client';
import type { ExerciseNoteDto } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { assertExercisesVisible } from '../exercises/exercise-visibility';

const toDto = (n: ExerciseNote): ExerciseNoteDto => ({
  id: n.id,
  exerciseId: n.exerciseId,
  body: n.body,
  createdAt: n.createdAt.toISOString(),
  updatedAt: n.updatedAt.toISOString(),
});

/** The athlete's persistent exercise notes. Private to the owner; every query is scoped by `clientId`. */
@Injectable()
export class ExerciseNotesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(clientId: string, exerciseId?: string): Promise<ExerciseNoteDto[]> {
    const rows = await this.prisma.exerciseNote.findMany({
      where: { clientId, ...(exerciseId ? { exerciseId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDto);
  }

  async create(clientId: string, exerciseId: string, body: string): Promise<ExerciseNoteDto> {
    await assertExercisesVisible(this.prisma, clientId, [exerciseId]);
    return toDto(await this.prisma.exerciseNote.create({ data: { clientId, exerciseId, body } }));
  }

  async update(clientId: string, id: string, body: string): Promise<ExerciseNoteDto> {
    await this.owned(clientId, id);
    return toDto(await this.prisma.exerciseNote.update({ where: { id }, data: { body } }));
  }

  async remove(clientId: string, id: string): Promise<void> {
    await this.owned(clientId, id);
    await this.prisma.exerciseNote.delete({ where: { id } });
  }

  private async owned(clientId: string, id: string): Promise<void> {
    const row = await this.prisma.exerciseNote.findFirst({ where: { id, clientId }, select: { id: true } });
    if (!row) throw new NotFoundException('Note not found');
  }
}
