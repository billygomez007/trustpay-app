ALTER TYPE "DealStatus" ADD VALUE IF NOT EXISTS 'buyer_confirmed';
ALTER TYPE "DealStatus" ADD VALUE IF NOT EXISTS 'release_pending';
ALTER TYPE "DealStatus" ADD VALUE IF NOT EXISTS 'released';
ALTER TYPE "DealStatus" ADD VALUE IF NOT EXISTS 'refunded';
ALTER TYPE "DealStatus" ADD VALUE IF NOT EXISTS 'expired';