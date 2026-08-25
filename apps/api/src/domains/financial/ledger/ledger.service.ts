import { BadRequestException, Injectable } from '@nestjs/common';
import { prisma } from '@trustpay/database';
import type { Prisma } from '@trustpay/database';

export type LedgerLineInput = Readonly<{
  accountCode: string;
  accountName: string;
  accountType: 'asset' | 'liability' | 'revenue' | 'expense';
  direction: 'debit' | 'credit';
  amount: string;
  currency: string;
}>;

export function assertBalanced(lines: readonly LedgerLineInput[]): void {
  const totals = lines.reduce(
    (result, line) => {
      const amount = toMinor(line.amount);
      if (line.direction === 'debit') result.debits += amount;
      else result.credits += amount;
      return result;
    },
    { debits: 0n, credits: 0n }
  );
  if (lines.length < 2 || totals.debits !== totals.credits) {
    throw new BadRequestException('Journal entries must have balanced debit and credit totals.');
  }
}

function toMinor(value: string): bigint {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(`${whole}${fraction.padEnd(2, '0').slice(0, 2)}`);
}

@Injectable()
export class LedgerService {
  public async postJournal(
    input: {
      reference: string;
      source: string;
      description: string;
      dealId?: string;
      paymentIntentId?: string;
      lines: readonly LedgerLineInput[];
    },
    transactionClient?: Prisma.TransactionClient
  ) {
    assertBalanced(input.lines);
    if (transactionClient) {
      return this.createJournal(transactionClient, input);
    }
    return prisma.$transaction((transaction) => this.createJournal(transaction, input));
  }

  private async createJournal(
    transaction: Prisma.TransactionClient,
    input: {
      reference: string;
      source: string;
      description: string;
      dealId?: string;
      paymentIntentId?: string;
      lines: readonly LedgerLineInput[];
    }
  ) {
    const accounts = await Promise.all(
      input.lines.map((line) =>
        transaction.ledgerAccount.upsert({
          where: { code: line.accountCode },
          create: {
            code: line.accountCode,
            name: line.accountName,
            accountType: line.accountType,
            currency: line.currency
          },
          update: {}
        })
      )
    );
    return transaction.journalEntry.create({
      data: {
        reference: input.reference,
        source: input.source,
        description: input.description,
        dealId: input.dealId ?? null,
        paymentIntentId: input.paymentIntentId ?? null,
        lines: {
          create: input.lines.map((line, index) => ({
            accountId: accounts[index]!.id,
            direction: line.direction,
            amount: line.amount,
            currency: line.currency
          }))
        }
      },
      include: { lines: true }
    });
  }
}
