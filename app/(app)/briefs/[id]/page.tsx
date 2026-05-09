import { BriefDetailClient } from "@/components/brief/BriefDetailClient";

export default function BriefDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <BriefDetailClient briefId={params.id} />;
}
