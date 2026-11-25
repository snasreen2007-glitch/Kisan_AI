import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { KnowledgeIndexPage } from "@/features/crop-care/pages/KnowledgeIndex";

export const Route = createFileRoute("/library/")({
  head: () => ({ meta: pageMeta("Crop knowledge", "Crop knowledge in the offline crop assistant.") }),
  component: KnowledgeIndexPage,
});
