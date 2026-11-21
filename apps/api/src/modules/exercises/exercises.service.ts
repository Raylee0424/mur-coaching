import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Exercise, Prisma } from '@prisma/client';
import { Role } from '@coaching/shared';
import type { RequestUser } from '../../common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExerciseDto, ListExercisesQuery, UpdateExerciseDto } from './dto/exercises.dto';
import { isAccessibleLink } from '../clients/link-status';

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Global library plus the viewer's coach's custom exercises (a coach sees their own). */
  async list(user: RequestUser, q: ListExercisesQuery): Promise<Exercise[]> {
    const coachId = await this.coachIdOf(user);
    return this.prisma.exercise.findMany({
      where: {
        OR: [{ coachId: null }, ...(coachId ? [{ coachId }] : [])],
        ...(q.muscleGroup ? { muscleGroup: q.muscleGroup } : {}),
        ...(q.q ? { name: { contains: q.q.trim(), mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(coachId: string, dto: CreateExerciseDto): Promise<Exercise> {
    await this.assertNameFree(coachId, dto.name);
    try {
      return await this.prisma.exercise.create({
        data: {
          coachId,
          name: dto.name,
          muscleGroup: dto.muscleGroup,
          equipment: dto.equipment ?? null,
          ...(dto.loadIncrementKg !== undefined ? { loadIncrementKg: dto.loadIncrementKg } : {}),
        },
      });
    } catch (err) {
      throw this.mapDuplicate(err);
    }
  }

  /** Only the coach's own custom exercises; global or other coaches' rows are 404. */
  async update(coachId: string, id: string, dto: UpdateExerciseDto): Promise<Exercise> {
    const existing = await this.prisma.exercise.findFirst({ where: { id, coachId } });
    if (!existing) throw new NotFoundException('Exercise not found');
    if (dto.name && dto.name.toLowerCase() !== existing.name.toLowerCase()) {
      await this.assertNameFree(coachId, dto.name);
    }
    try {
      return await this.prisma.exercise.update({
        where: { id },
        data: {
          ...(dto.name ? { name: dto.name } : {}),
          ...(dto.muscleGroup ? { muscleGroup: dto.muscleGroup } : {}),
          ...(dto.equipment !== undefined ? { equipment: dto.equipment } : {}),
          ...(dto.loadIncrementKg !== undefined ? { loadIncrementKg: dto.loadIncrementKg } : {}),
        },
      });
    } catch (err) {
      throw this.mapDuplicate(err);
    }
  }

  private async coachIdOf(user: RequestUser): Promise<string | null> {
    if (user.role === Role.COACH) return user.id;
    const link = await this.prisma.coachClient.findUnique({ where: { clientId: user.id } });
    return link && isAccessibleLink(link.status) ? link.coachId : null;
  }

  /** Names are unique case-insensitively across the global library and the coach's own exercises. */
  private async assertNameFree(coachId: string, name: string): Promise<void> {
    const clash = await this.prisma.exercise.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, OR: [{ coachId: null }, { coachId }] },
      select: { id: true },
    });
    if (clash) throw new ConflictException('An exercise with this name already exists');
  }

  private mapDuplicate(err: unknown): unknown {
    return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
      ? new ConflictException('An exercise with this name already exists')
      : err;
  }
}
