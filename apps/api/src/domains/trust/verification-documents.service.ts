import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@trustpay/database';
import type { AuditService } from '../audit/audit.service.js';
import type { TrustOperationsService } from './trust-operations.service.js';

@Injectable()
export class VerificationDocumentsService {
  public constructor(
    private readonly audit: AuditService,
    private readonly operations: TrustOperationsService
  ) {}

  public async registerForUser(
    userId: string,
    input: {
      identityVerificationId?: string | undefined;
      businessVerificationId?: string | undefined;
      documentType: string;
      storageReference: string;
      expiresAt?: string | undefined;
    }
  ) {
    if (!input.identityVerificationId && !input.businessVerificationId) {
      throw new ForbiddenException('A verification case is required.');
    }
    if (input.identityVerificationId) {
      const identity = await prisma.identityVerification.findFirst({
        where: { id: input.identityVerificationId, userId }
      });
      if (!identity) throw new NotFoundException('Identity verification not found.');
    }
    if (input.businessVerificationId) {
      const business = await prisma.businessVerification.findFirst({
        where: { id: input.businessVerificationId, business: { members: { some: { userId } } } }
      });
      if (!business) throw new NotFoundException('Business verification not found.');
    }
    const document = await prisma.verificationDocument.create({
      data: {
        ownerUserId: userId,
        ownerBusinessId: input.businessVerificationId
          ? (await prisma.businessVerification.findUnique({ where: { id: input.businessVerificationId }, select: { businessId: true } }))?.businessId ?? null
          : null,
        identityVerificationId: input.identityVerificationId ?? null,
        businessVerificationId: input.businessVerificationId ?? null,
        documentType: input.documentType,
        storageReference: input.storageReference,
        status: 'submitted',
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null
      }
    });
    await this.audit.record({
      actorId: userId,
      action: 'trust.document.registered',
      resource: `verification-document:${document.id}`
    });
    return document;
  }

  public async accessForStaff(actorId: string, documentId: string) {
    await this.operations.requirePermission(actorId, 'trust.documents.view');
    const document = await prisma.verificationDocument.findUnique({ where: { id: documentId } });
    if (!document) throw new NotFoundException('Verification document not found.');
    await prisma.verificationDocumentAccessLog.create({
      data: { documentId, actorId, action: 'metadata_viewed' }
    });
    await this.audit.record({
      actorId,
      action: 'trust.document.accessed',
      resource: `verification-document:${documentId}`
    });
    return document;
  }
}
