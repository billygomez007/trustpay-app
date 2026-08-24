import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { DealStatus } from '@trustpay/types';

const transitions: Readonly<Record<DealStatus, readonly DealStatus[]>> = {
  draft: ['invited', 'cancelled'],
  invited: ['parties_accepted', 'cancelled'],
  parties_accepted: ['awaiting_payment', 'cancelled', 'disputed'],
  created: ['awaiting_payment', 'cancelled', 'disputed'],
  awaiting_payment: ['payment_secured', 'cancelled', 'disputed'],
  payment_secured: ['seller_accepted', 'cancelled', 'disputed'],
  seller_accepted: ['fulfillment_started', 'cancelled', 'disputed'],
  fulfillment_started: ['delivered', 'disputed'],
  delivered: ['inspection_period', 'disputed'],
  inspection_period: ['buyer_confirmed', 'disputed'],
  buyer_confirmed: ['release_pending', 'disputed'],
  release_pending: ['released', 'disputed'],
  released: [],
  completed: [],
  cancelled: [],
  disputed: ['refunded', 'released'],
  refunded: [],
  expired: []
};

export function assertValidTransition(current: DealStatus, target: DealStatus): void {
  if (!transitions[current].includes(target)) {
    throw new BadRequestException(`Cannot transition a deal from ${current} to ${target}.`);
  }
}

export function assertActorCanTransition(input: {
  current: DealStatus;
  target: DealStatus;
  actorId: string;
  buyerId: string;
  sellerId: string;
}): void {
  const isBuyer = input.actorId === input.buyerId;
  const isSeller = input.actorId === input.sellerId;
  if (!isBuyer && !isSeller) {
    throw new ForbiddenException('Only Deal parties may transition this Deal.');
  }
  if (input.target === 'payment_secured') {
    throw new ForbiddenException(
      'Payment security can only be confirmed by a verified provider callback.'
    );
  }
  if (['release_pending', 'released', 'refunded'].includes(input.target)) {
    throw new ForbiddenException('This financial transition requires a verified internal workflow.');
  }
  if (
    ['seller_accepted', 'fulfillment_started', 'delivered', 'inspection_period'].includes(
      input.target
    ) &&
    !isSeller
  ) {
    throw new ForbiddenException('Only the seller may perform this fulfillment transition.');
  }
  if (['buyer_confirmed', 'completed'].includes(input.target) && !isBuyer) {
    throw new ForbiddenException('Only the buyer may confirm completion.');
  }
}
