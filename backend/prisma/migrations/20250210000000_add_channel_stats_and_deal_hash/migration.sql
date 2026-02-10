-- AlterTable
ALTER TABLE "Channel" ADD COLUMN "languageCharts" JSONB;

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN "draftContentHash" TEXT;
