import { Injectable } from '@nestjs/common';

export function calculateFee(input: {
  amount: string;
  percentage?: string;
  fixedAmount?: string;
}): string {
  const amount = toMinor(input.amount);
  const percentageBasisPoints = input.percentage ? toBasisPoints(input.percentage) : 0n;
  const percentageFee = (amount * percentageBasisPoints) / 10_000n;
  const fixedFee = input.fixedAmount ? toMinor(input.fixedAmount) : 0n;
  return fromMinor(percentageFee + fixedFee);
}

function toMinor(value: string): bigint {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(`${whole}${fraction.padEnd(2, '0').slice(0, 2)}`);
}

function fromMinor(value: bigint): string {
  const whole = value / 100n;
  const fraction = (value % 100n).toString().padStart(2, '0');
  return `${whole}.${fraction}`;
}

function toBasisPoints(value: string): bigint {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(`${whole}${fraction.padEnd(2, '0').slice(0, 2)}`);
}

@Injectable()
export class FeeCalculationService {
  public calculate(input: { amount: string; percentage?: string; fixedAmount?: string }): string {
    return calculateFee(input);
  }
}
