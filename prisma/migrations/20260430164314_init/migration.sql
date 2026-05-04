-- CreateEnum
CREATE TYPE "AdType" AS ENUM ('POPUNDER', 'SOCIAL_BAR', 'NATIVE_BANNER', 'BANNER', 'SMARTLINK', 'INTERSTITIAL');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "cloudinaryId" TEXT NOT NULL,
    "hlsUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoTag" (
    "videoId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoTag_pkey" PRIMARY KEY ("videoId","tagId")
);

-- CreateTable
CREATE TABLE "AdUnit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AdType" NOT NULL,
    "script" TEXT NOT NULL,
    "placement" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "cooldownSeconds" INTEGER,
    "frequencyCap" INTEGER,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdSetting" (
    "id" TEXT NOT NULL,
    "popunderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smartlinkEnabled" BOOLEAN NOT NULL DEFAULT true,
    "interstitialEnabled" BOOLEAN NOT NULL DEFAULT true,
    "socialBarEnabled" BOOLEAN NOT NULL DEFAULT true,
    "bannerEnabled" BOOLEAN NOT NULL DEFAULT true,
    "nativeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smartlinkMinPerMinute" INTEGER NOT NULL DEFAULT 2,
    "smartlinkMaxPerMinute" INTEGER NOT NULL DEFAULT 3,
    "interstitialGapSeconds" INTEGER NOT NULL DEFAULT 60,
    "interstitialEveryVideos" INTEGER NOT NULL DEFAULT 3,
    "popunderCooldownHours" INTEGER NOT NULL DEFAULT 24,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdSession" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "smartClicks" INTEGER NOT NULL DEFAULT 0,
    "interstitialCount" INTEGER NOT NULL DEFAULT 0,
    "videoCount" INTEGER NOT NULL DEFAULT 0,
    "popunderShown" BOOLEAN NOT NULL DEFAULT false,
    "lastSmartTrigger" TIMESTAMP(3),
    "lastInterstitial" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");

-- CreateIndex
CREATE INDEX "Admin_createdAt_idx" ON "Admin"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Video_slug_key" ON "Video"("slug");

-- CreateIndex
CREATE INDEX "Video_isPublished_createdAt_idx" ON "Video"("isPublished", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Video_categoryId_isPublished_idx" ON "Video"("categoryId", "isPublished");

-- CreateIndex
CREATE INDEX "Video_views_idx" ON "Video"("views" DESC);

-- CreateIndex
CREATE INDEX "Video_createdAt_idx" ON "Video"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_createdAt_idx" ON "Category"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "Tag_name_idx" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "Tag_createdAt_idx" ON "Tag"("createdAt");

-- CreateIndex
CREATE INDEX "VideoTag_tagId_idx" ON "VideoTag"("tagId");

-- CreateIndex
CREATE INDEX "VideoTag_videoId_idx" ON "VideoTag"("videoId");

-- CreateIndex
CREATE INDEX "AdUnit_type_isActive_idx" ON "AdUnit"("type", "isActive");

-- CreateIndex
CREATE INDEX "AdUnit_placement_isActive_idx" ON "AdUnit"("placement", "isActive");

-- CreateIndex
CREATE INDEX "AdUnit_priority_idx" ON "AdUnit"("priority" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "AdSession_sessionId_key" ON "AdSession"("sessionId");

-- CreateIndex
CREATE INDEX "AdSession_sessionId_idx" ON "AdSession"("sessionId");

-- CreateIndex
CREATE INDEX "AdSession_updatedAt_idx" ON "AdSession"("updatedAt");

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTag" ADD CONSTRAINT "VideoTag_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTag" ADD CONSTRAINT "VideoTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
