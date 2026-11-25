import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { TopicDetailPage } from "@/features/crop-care/pages/TopicDetail";

export const Route = createFileRoute("/library/$crop/$slug")({
  head: () => ({ meta: pageMeta("Crop topic", "Crop topic in the offline crop assistant.") }),
  component: TopicDetailPage,
});
