-- DropForeignKey
ALTER TABLE "VideoTag" DROP CONSTRAINT "VideoTag_tagId_fkey";

-- DropForeignKey
ALTER TABLE "VideoTag" DROP CONSTRAINT "VideoTag_videoId_fkey";

-- AddForeignKey
ALTER TABLE "VideoTag" ADD CONSTRAINT "VideoTag_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTag" ADD CONSTRAINT "VideoTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
