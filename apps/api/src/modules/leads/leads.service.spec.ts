import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { IntakeService } from './intake.service';
import { LeadsService } from './leads.service';

describe('LeadsService.update', () => {
  const setup = (stage: string | null) => {
    const prisma = {
      lead: {
        findFirst: vi.fn().mockResolvedValue(stage ? { stage } : null),
        update: vi.fn().mockResolvedValue({ id: 'l1', stage: 'LOST', invites: [], responses: [], createdAt: new Date(), callAt: null, convertedAt: null }),
      },
    };
    return { prisma, service: new LeadsService(prisma as never) };
  };

  it('scopes the lookup to the coach and 404s a foreign lead', async () => {
    const { service, prisma } = setup(null);
    await expect(service.update('c1', 'l1', { stage: 'LOST' })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.lead.findFirst).toHaveBeenCalledWith({ where: { id: 'l1', coachId: 'c1' }, select: { stage: true } });
  });

  it('refuses a manual move to ACTIVE and any move off ACTIVE', async () => {
    await expect(setup('NEW').service.update('c1', 'l1', { stage: 'ACTIVE' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(setup('ACTIVE').service.update('c1', 'l1', { stage: 'LOST' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows ordinary stage moves', async () => {
    const { service, prisma } = setup('NEW');
    await service.update('c1', 'l1', { stage: 'LOST', notes: '' });
    expect(prisma.lead.update).toHaveBeenCalledWith(expect.objectContaining({ data: { stage: 'LOST', notes: null } }));
  });
});

describe('IntakeService.submit', () => {
  const brand = { coachId: 'c1', acceptingLeads: true, coach: { name: 'C', displayName: null } };
  const questions = [{ id: 'q1', label: 'Injuries?', required: true, type: 'TEXT' }];
  const setup = () => {
    const tx = {
      lead: { upsert: vi.fn().mockResolvedValue({ id: 'l1' }), updateMany: vi.fn() },
      intakeResponse: { create: vi.fn() },
    };
    const prisma = {
      coachBrand: { findUnique: vi.fn().mockResolvedValue(brand) },
      intakeForm: { findUnique: vi.fn().mockResolvedValue({ id: 'f1', questions }) },
      $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    };
    return { tx, prisma, service: new IntakeService(prisma as never) };
  };
  const dto = { name: 'Jo', email: 'jo@x.co', answers: [{ questionId: 'q1', answer: 'Knee' }] };

  it('drops a honeypot hit silently without touching the database', async () => {
    const { service, prisma } = setup();
    await expect(service.submit('s', { ...dto, website: 'http://spam' } as never)).resolves.toEqual({ received: true });
    expect(prisma.coachBrand.findUnique).not.toHaveBeenCalled();
  });

  it('stores lead and labelled answers, reopening a lost lead', async () => {
    const { service, tx } = setup();
    await service.submit('s', dto as never);
    expect(tx.lead.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { coachId_email: { coachId: 'c1', email: 'jo@x.co' } } }));
    expect(tx.lead.updateMany).toHaveBeenCalledWith({ where: { id: 'l1', stage: 'LOST' }, data: { stage: 'NEW' } });
    expect(tx.intakeResponse.create).toHaveBeenCalledWith({ data: expect.objectContaining({ answers: [{ question: 'Injuries?', answer: 'Knee' }] }) });
  });

  it('rejects a missing required answer and a closed form', async () => {
    const { service, prisma } = setup();
    await expect(service.submit('s', { ...dto, answers: [] } as never)).rejects.toBeInstanceOf(BadRequestException);
    prisma.coachBrand.findUnique.mockResolvedValue({ ...brand, acceptingLeads: false });
    await expect(service.submit('s', dto as never)).rejects.toBeInstanceOf(NotFoundException);
  });
});
