# MR Video App Flow

## Public Visitor Flow

1. User lands on `/`.
2. Header loads the first 8 categories and first 8 tags.
3. Home loads the first 12 published videos.
4. When the user scrolls near the bottom, the client requests the next 12 videos.
5. Header search sends users to `/search?q=term`.
6. Category links open `/category/[slug]`.
7. Tag links open `/tag/[slug]`.
8. Video cards open `/watch/[slug]`.
9. Watch page loads the video, related videos, and active ads.
10. The monetization engine listens to play, pause, seek, volume, fullscreen, timeupdate, and next-video events.

## Admin Flow

1. Admin logs in at `/admin/login`.
2. Middleware protects `/admin/*`.
3. Server mutations also call `requireAdmin()`.
4. Admin creates categories and tags.
5. Admin creates videos:
   - Browser uploads media directly to Cloudinary.
   - Server action saves metadata and Cloudinary IDs.
   - Published videos appear on public pages after revalidation.
6. Admin creates Adsterra ad units:
   - Popunder, SmartLink, Interstitial, Social Bar, Native, Banner.
   - Public pages load DB ads in production.
   - Development falls back to visible dev ads when no DB ads exist.

## Storage Flow

Current:

```text
Browser -> Cloudinary unsigned upload -> Server action saves metadata -> Prisma Postgres
```

Future R2:

```text
Browser/Admin -> R2 upload -> HLS transcode -> R2 CDN URL -> Prisma Postgres
```

See `src/lib/storage/cloudflare-r2-storage.ts`.

## Caching Flow

- Public pages use ISR with `revalidate = 3600`.
- Admin mutations call `revalidatePath`.
- Home, search, category, and tag pages load more videos in batches of 12.

## Ad Flow

```text
Page loads active DB ads
  -> passive banner/native slots render
  -> watch player initializes engine
  -> play may trigger popunder
  -> user interactions may trigger SmartLink
  -> next-video may trigger interstitial
  -> watch-time may trigger social bar
```
