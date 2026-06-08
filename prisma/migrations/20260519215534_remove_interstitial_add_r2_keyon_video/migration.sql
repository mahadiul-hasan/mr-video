/*
  Warnings:

  - The values [INTERSTITIAL] on the enum `AdType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `interstitialCount` on the `AdSession` table. All the data in the column will be lost.
  - You are about to drop the column `lastInterstitial` on the `AdSession` table. All the data in the column will be lost.
  - You are about to drop the column `interstitialEnabled` on the `AdSetting` table. All the data in the column will be lost.
  - You are about to drop the column `interstitialEveryVideos` on the `AdSetting` table. All the data in the column will be lost.
  - You are about to drop the column `interstitialGapSeconds` on the `AdSetting` table. All the data in the column will be lost.
  - You are about to drop the column `weightInterstitial` on the `AdSetting` table. All the data in the column will be lost.
  - You are about to drop the column `cloudinaryId` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Video` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[r2Key]` on the table `Video` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `r2Key` to the `Video` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AdType_new" AS ENUM ('POPUNDER', 'SOCIAL_BAR', 'NATIVE_BANNER', 'BANNER', 'SMARTLINK');
ALTER TABLE "AdUnit" ALTER COLUMN "type" TYPE "AdType_new" USING ("type"::text::"AdType_new");
ALTER TYPE "AdType" RENAME TO "AdType_old";
ALTER TYPE "AdType_new" RENAME TO "AdType";
DROP TYPE "public"."AdType_old";
COMMIT;

-- AlterTable
ALTER TABLE "AdSession" DROP COLUMN "interstitialCount",
DROP COLUMN "lastInterstitial";

-- AlterTable
ALTER TABLE "AdSetting" DROP COLUMN "interstitialEnabled",
DROP COLUMN "interstitialEveryVideos",
DROP COLUMN "interstitialGapSeconds",
DROP COLUMN "weightInterstitial";

-- AlterTable
ALTER TABLE "Video" DROP COLUMN "cloudinaryId",
DROP COLUMN "description",
ADD COLUMN     "r2Key" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Video_r2Key_key" ON "Video"("r2Key");
