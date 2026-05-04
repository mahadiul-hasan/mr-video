/*
  Warnings:

  - You are about to drop the column `popunderShown` on the `AdSession` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "AdSession_updatedAt_idx";

-- DropIndex
DROP INDEX "AdUnit_placement_isActive_idx";

-- AlterTable
ALTER TABLE "AdSession" DROP COLUMN "popunderShown",
ADD COLUMN     "engagementScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "lastPopunder" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AdSetting" ADD COLUMN     "weightBanner" INTEGER NOT NULL DEFAULT 40,
ADD COLUMN     "weightInterstitial" INTEGER NOT NULL DEFAULT 90,
ADD COLUMN     "weightNative" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "weightPopunder" INTEGER NOT NULL DEFAULT 120,
ADD COLUMN     "weightSmartlink" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "weightSocialBar" INTEGER NOT NULL DEFAULT 70;

-- CreateIndex
CREATE INDEX "AdUnit_placement_idx" ON "AdUnit"("placement");
