import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { BillingController, CoachBillingController, MeBillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { EntitlementGuard } from './entitlement.guard';
import { EntitlementsService } from './entitlements.service';
import { OffersService } from './offers.service';
import { StripeErrorFilter } from './stripe-error.filter';
import { StripeService } from './stripe.service';
import { WebhookService } from './webhook.service';

/** Global so any module can check seats and the app-level EntitlementGuard can resolve plans. */
@Global()
@Module({
  controllers: [BillingController, MeBillingController, CoachBillingController],
  providers: [{ provide: APP_FILTER, useClass: StripeErrorFilter }, StripeService, EntitlementsService, EntitlementGuard, BillingService, OffersService, WebhookService],
  exports: [EntitlementsService, EntitlementGuard],
})
export class BillingModule {}
