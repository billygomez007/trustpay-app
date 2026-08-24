export type VerificationProviderSubmission = {
  reference: string;
  country: string;
  documentType?: string;
};

export type VerificationProviderResult = {
  providerReference: string;
  status: 'submitted' | 'under_review' | 'verified' | 'rejected';
  details?: Record<string, string>;
};

export interface IdentityVerificationProvider {
  submitVerification(input: VerificationProviderSubmission): Promise<VerificationProviderResult>;
  checkStatus(providerReference: string): Promise<VerificationProviderResult>;
  retrieveResult(providerReference: string): Promise<VerificationProviderResult>;
}

export interface BusinessVerificationProvider {
  submitVerification(input: VerificationProviderSubmission): Promise<VerificationProviderResult>;
  checkStatus(providerReference: string): Promise<VerificationProviderResult>;
  retrieveResult(providerReference: string): Promise<VerificationProviderResult>;
}

class MockVerificationProvider {
  public async submitVerification(
    input: VerificationProviderSubmission
  ): Promise<VerificationProviderResult> {
    return { providerReference: `mock-${input.reference}`, status: 'submitted' };
  }
  public async checkStatus(providerReference: string): Promise<VerificationProviderResult> {
    return { providerReference, status: 'under_review' };
  }
  public async retrieveResult(providerReference: string): Promise<VerificationProviderResult> {
    return { providerReference, status: 'under_review' };
  }
}

export class MockIdentityVerificationProvider
  extends MockVerificationProvider
  implements IdentityVerificationProvider {}

export class MockBusinessVerificationProvider
  extends MockVerificationProvider
  implements BusinessVerificationProvider {}
