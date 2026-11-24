import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Feature } from '@coaching/shared';
import type { Request } from 'express';
import type { RequestUser } from '../../common/auth-user';
import { FEATURE_KEY } from '../../common/decorators/requires-feature.decorator';
import { UPGRADE_MESSAGES } from './entitlements';
import { EntitlementsService } from './entitlements.service';

/** Global guard after JwtAuthGuard and RolesGuard: enforces @RequiresFeature with 402 Payment Required. */
@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlements: EntitlementsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<Feature | undefined>(FEATURE_KEY, [context.getHandler(), context.getClass()]);
    if (!feature) return true;
    const { user } = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    if (!user) throw new HttpException('Unauthorized', 401);
    const access = await this.entitlements.resolve(user.id);
    if (!access.features.includes(feature)) {
      throw new HttpException(UPGRADE_MESSAGES[feature] ?? 'Your plan does not include this feature. Upgrade on the Billing page.', 402);
    }
    return true;
  }
}
