import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Post, Req, type RawBodyRequest } from '@nestjs/common';
import { Feature, Role } from '@coaching/shared';
import type { ClientOffersDto, CoachBillingDto, CoachOfferDto, EntitlementsDto, RedirectUrlDto } from '@coaching/shared';
import type { Request } from 'express';
import { CurrentUser, Public, RequestUser, RequiresFeature, Roles } from '../../common';
import { BillingService } from './billing.service';
import { CheckoutDto, CreateCoachOfferDto } from './dto/billing.dto';
import { EntitlementsService } from './entitlements.service';
import { OffersService } from './offers.service';
import { WebhookService } from './webhook.service';

/** Platform plan checkout, billing portal and the Stripe webhook. */
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly webhooks: WebhookService,
  ) {}

  @Post('checkout')
  @HttpCode(200)
  checkout(@CurrentUser() user: RequestUser, @Body() dto: CheckoutDto): Promise<RedirectUrlDto> {
    return this.billing.checkout(user.id, dto.planId);
  }

  @Post('portal')
  @HttpCode(200)
  portal(@CurrentUser() user: RequestUser): Promise<RedirectUrlDto> {
    return this.billing.portal(user.id);
  }

  /** Called by Stripe, not the browser. Authenticated by the Stripe-Signature header over the raw body. */
  @Public()
  @Post('webhook')
  @HttpCode(200)
  async webhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature?: string): Promise<{ received: true }> {
    await this.webhooks.receive(req.rawBody, signature);
    return { received: true };
  }

  /** Connect endpoint: connected-account events, signed with STRIPE_CONNECT_WEBHOOK_SECRET. */
  @Public()
  @Post('webhooks/connect')
  @HttpCode(200)
  async connectWebhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature?: string): Promise<{ received: true }> {
    await this.webhooks.receive(req.rawBody, signature, 'connect');
    return { received: true };
  }
}

@Controller('me')
export class MeBillingController {
  constructor(
    private readonly entitlements: EntitlementsService,
    private readonly offers: OffersService,
  ) {}

  @Get('entitlements')
  entitlementsFor(@CurrentUser() user: RequestUser): Promise<EntitlementsDto> {
    return this.entitlements.forUser(user.id);
  }

  /** The client's coach's offers plus the client's own offer subscriptions. */
  @Roles(Role.CLIENT)
  @Get('offers')
  listOffers(@CurrentUser() user: RequestUser): Promise<ClientOffersDto> {
    return this.offers.clientOffers(user.id);
  }

  @Roles(Role.CLIENT)
  @Post('offers/:id/checkout')
  @HttpCode(200)
  checkoutOffer(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<RedirectUrlDto> {
    return this.offers.checkoutOffer(user.id, id);
  }
}

/** Coach side of client payments. Every query is scoped to the signed-in coach. */
@Roles(Role.COACH)
@Controller('coach')
export class CoachBillingController {
  constructor(private readonly offers: OffersService) {}

  @Get('billing')
  overview(@CurrentUser() user: RequestUser): Promise<CoachBillingDto> {
    return this.offers.coachBilling(user.id);
  }

  @RequiresFeature(Feature.CLIENT_PAYMENTS)
  @Post('billing/connect')
  @HttpCode(200)
  connect(@CurrentUser() user: RequestUser): Promise<RedirectUrlDto> {
    return this.offers.connect(user.id);
  }

  @Post('billing/dashboard')
  @HttpCode(200)
  dashboard(@CurrentUser() user: RequestUser): Promise<RedirectUrlDto> {
    return this.offers.dashboard(user.id);
  }

  @RequiresFeature(Feature.CLIENT_PAYMENTS)
  @Post('offers')
  createOffer(@CurrentUser() user: RequestUser, @Body() dto: CreateCoachOfferDto): Promise<CoachOfferDto> {
    return this.offers.createOffer(user.id, dto);
  }

  @Delete('offers/:id')
  @HttpCode(204)
  archiveOffer(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.offers.archiveOffer(user.id, id);
  }
}
