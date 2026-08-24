export interface LedgerPort {
  postBalancedJournal(input: {
    reference: string;
    debitAccount: string;
    creditAccount: string;
    amount: string;
    currency: string;
  }): Promise<void>;
}
