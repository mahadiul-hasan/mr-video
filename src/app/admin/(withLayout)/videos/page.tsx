import { getVideosAdmin } from "@/app/actions/video";
import VideoTable from "@/components/admin/videos/video-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Videos - Admin",
  description: "Manage your video library",
};

type PageProps = {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
};

export default async function VideosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page) : 1;
  const search = params.search || "";
  const limit = 10;

  const { videos, total } = await getVideosAdmin({ page, limit, search });

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Video Manager</h1>
        <p className="text-muted-foreground mt-1">
          Upload, manage, and publish videos to your library
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Videos</CardTitle>
        </CardHeader>
        <CardContent>
          <VideoTable data={videos} total={total} page={page} search={search} />
        </CardContent>
      </Card>
    </div>
  );
}
