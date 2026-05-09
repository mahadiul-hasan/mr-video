import { LoadingGrid } from "@/components/site/loading-grid";

export default function Loading() {
  return <LoadingGrid count={8} columns={4} showHeader={true} />;
}
