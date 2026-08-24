-- AlterEnum
ALTER TYPE "FraudCaseStatus" ADD VALUE 'under_review';
ALTER TYPE "FraudCaseStatus" ADD VALUE 'more_information_required';
ALTER TYPE "FraudCaseStatus" ADD VALUE 'cleared';
ALTER TYPE "FraudCaseStatus" ADD VALUE 'action_required';
ALTER TYPE "FraudCaseStatus" ADD VALUE 'closed';

ALTER TYPE "RiskSeverity" ADD VALUE 'critical_review';
