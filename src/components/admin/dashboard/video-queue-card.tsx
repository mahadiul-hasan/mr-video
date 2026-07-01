"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getVideoQueueStatus } from "@/app/actions/cache";

type QueueStatus = {
  queuedJobs: number;
  processingJobs: number;
  processingVideos: number;
  readyVideos: number;
  failedVideos: number;
  workerLastSeenAt: string | null;
  workerIsHealthy: boolean;
  recentFailures: {
    id: string;
    title: string;
    slug: string;
    processingError: string | null;
    updatedAt: string;
  }[];
};

export function VideoQueueCard() {
  const [status, setStatus] = useState<QueueStatus | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const result = await getVideoQueueStatus();
      if (active && result.success && result.data) {
        setStatus(result.data);
      }
    }

    void load();
    const interval = window.setInterval(load, 8000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Video Queue</CardTitle>
            <CardDescription>Encoding jobs and processing health</CardDescription>
          </div>
          <Badge
            variant={status?.workerIsHealthy ? "secondary" : "destructive"}
            className="w-fit"
          >
            Worker {status?.workerIsHealthy ? "online" : "offline"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Metric label="Queued Jobs" value={status?.queuedJobs ?? 0} />
          <Metric label="Active Jobs" value={status?.processingJobs ?? 0} />
          <Metric label="Processing Videos" value={status?.processingVideos ?? 0} />
          <Metric label="Ready Videos" value={status?.readyVideos ?? 0} />
          <Metric
            label="Failed Videos"
            value={status?.failedVideos ?? 0}
            variant={(status?.failedVideos ?? 0) > 0 ? "destructive" : "secondary"}
          />
        </div>

        <div className="rounded-lg border p-3 text-sm">
          <div className="text-xs text-muted-foreground">Worker Last Seen</div>
          <div className="mt-1 font-medium">
            {status?.workerLastSeenAt
              ? new Date(status.workerLastSeenAt).toLocaleString()
              : "No heartbeat yet"}
          </div>
        </div>

        {(status?.recentFailures?.length ?? 0) > 0 && (
          <div className="rounded-lg border border-destructive/30 p-3">
            <div className="mb-2 text-sm font-semibold text-destructive">
              Recent Failed Videos
            </div>
            <div className="space-y-2">
              {status?.recentFailures.map((failure) => (
                <div key={failure.id} className="rounded-md bg-muted/50 p-2 text-sm">
                  <div className="font-medium">{failure.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {new Date(failure.updatedAt).toLocaleString()}
                  </div>
                  {failure.processingError && (
                    <div className="mt-1 line-clamp-2 text-xs text-destructive">
                      {failure.processingError}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  variant = "secondary",
}: {
  label: string;
  value: number;
  variant?: "secondary" | "destructive";
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <Badge variant={variant} className="mt-2 text-base">
        {value}
      </Badge>
    </div>
  );
}
