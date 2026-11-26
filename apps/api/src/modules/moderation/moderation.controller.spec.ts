import { GUARDS_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { ModerationController } from './moderation.controller';
import { ModeratorGuard } from './moderator.guard';

describe('ModerationController', () => {
  it('is guarded by ModeratorGuard at class level, so both routes 404 for non-moderators', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, ModerationController)).toContain(ModeratorGuard);
  });

  it('has no role restriction on either handler', () => {
    const proto = ModerationController.prototype;
    expect(Reflect.getMetadata(ROLES_KEY, proto.list)).toBeUndefined();
    expect(Reflect.getMetadata(ROLES_KEY, proto.setStatus)).toBeUndefined();
    expect(Reflect.getMetadata(ROLES_KEY, ModerationController)).toBeUndefined();
  });
});
