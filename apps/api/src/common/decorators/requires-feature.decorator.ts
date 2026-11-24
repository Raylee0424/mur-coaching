import { SetMetadata } from '@nestjs/common';
import type { Feature } from '@coaching/shared';

export const FEATURE_KEY = 'requiredFeature';
/** Route needs this plan feature; EntitlementGuard answers 402 otherwise. */
export const RequiresFeature = (feature: Feature): MethodDecorator & ClassDecorator => SetMetadata(FEATURE_KEY, feature);
