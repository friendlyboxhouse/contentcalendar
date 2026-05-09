import { PerformanceDetailClient } from "../PerformanceDetailClient";

export default function PerformanceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <PerformanceDetailClient id={params.id} />;
}
