import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './domains/auth/auth.controller.js';
import { AuthService } from './domains/auth/auth.service.js';
import { SessionAuthGuard } from './domains/auth/session-auth.guard.js';
import { AuditService } from './domains/audit/audit.service.js';
import { BusinessesController } from './domains/businesses/businesses.controller.js';
import { TenantService } from './domains/businesses/tenant.service.js';
import { DealsController } from './domains/deals/deals.controller.js';
import { DealsService } from './domains/deals/deals.service.js';
import { DealInvitationsService } from './domains/deals/deal-invitations.service.js';
import { DealInvitationsController } from './domains/deals/deal-invitations.controller.js';
import { FinancialController } from './domains/financial/financial.controller.js';
import { FeeCalculationService } from './domains/financial/fees/fee-calculation.service.js';
import { LedgerService } from './domains/financial/ledger/ledger.service.js';
import { PaymentIntentsService } from './domains/financial/payments/payment-intents.service.js';
import { MockPaymentProvider } from './domains/financial/providers/mock-payment.provider.js';
import { PaystackPaymentProvider } from './domains/financial/providers/paystack-payment.provider.js';
import { ProviderRegistryService } from './domains/financial/providers/provider-registry.service.js';
import { RefundsService } from './domains/financial/refunds/refunds.service.js';
import { SettlementsService } from './domains/financial/settlements/settlements.service.js';
import { NotificationsController } from './domains/notifications/notifications.controller.js';
import { NotificationService } from './domains/notifications/notification.service.js';
import { ReviewsService } from './domains/trust/reviews.service.js';
import { TrustScoreService } from './domains/trust/trust-score.service.js';
import { TrustController } from './domains/trust/trust.controller.js';
import { TrustService } from './domains/trust/trust.service.js';
import { TrustOperationsController } from './domains/trust/trust-operations.controller.js';
import { TrustOperationsService } from './domains/trust/trust-operations.service.js';
import { RiskEvaluationService } from './domains/trust/risk-evaluation.service.js';
import { VerificationDocumentsService } from './domains/trust/verification-documents.service.js';
import { HealthController } from './health.controller.js';
import { DisputesController } from './domains/disputes/disputes.controller.js';
import { DisputesService } from './domains/disputes/disputes.service.js';
import { ProductsController } from './domains/commerce/products.controller.js';
import { ProductsService } from './domains/commerce/products.service.js';
import { OrdersController } from './domains/commerce/orders.controller.js';
import { OrdersService } from './domains/commerce/orders.service.js';

@Module({
  controllers: [
    HealthController,
    AuthController,
    BusinessesController,
    DealsController,
    DealInvitationsController,
    NotificationsController,
    FinancialController,
    TrustController,
    TrustOperationsController,
    DisputesController,
    ProductsController,
    OrdersController
  ],
  providers: [
    AuthService,
    AuditService,
    TenantService,
    DealsService,
    DealInvitationsService,
    NotificationService,
    FeeCalculationService,
    LedgerService,
    PaymentIntentsService,
    MockPaymentProvider,
    PaystackPaymentProvider,
    ProviderRegistryService,
    RefundsService,
    SettlementsService,
    ReviewsService,
    TrustScoreService,
    TrustService,
    TrustOperationsService,
    RiskEvaluationService,
    VerificationDocumentsService,
    DisputesService,
    ProductsService,
    OrdersService,
    { provide: APP_GUARD, useClass: SessionAuthGuard }
  ]
})
export class AppModule {}
