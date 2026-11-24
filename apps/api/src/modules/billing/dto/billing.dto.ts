import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { OfferInterval, PlanId } from '@coaching/shared';
import type { CheckoutRequest, CreateCoachOfferRequest } from '@coaching/shared';

export class CheckoutDto implements CheckoutRequest {
  @IsIn([PlanId.ATHLETE_PRO, PlanId.COACH])
  planId!: typeof PlanId.ATHLETE_PRO | typeof PlanId.COACH;
}

export class CreateCoachOfferDto implements CreateCoachOfferRequest {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** Stripe's card minimum is $0.50; cap at $10,000. */
  @IsInt()
  @Min(50)
  @Max(1_000_000)
  priceCents!: number;

  @IsIn(Object.values(OfferInterval))
  interval!: OfferInterval;
}
