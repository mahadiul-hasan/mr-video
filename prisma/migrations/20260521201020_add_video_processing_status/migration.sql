-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "processingError" TEXT,
ADD COLUMN     "status" "VideoStatus" NOT NULL DEFAULT 'PROCESSING';

-- CreateIndex
CREATE INDEX "Video_status_isPublished_createdAt_idx" ON "Video"("status", "isPublished", "createdAt" DESC);
