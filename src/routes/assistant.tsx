import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { AssistantPage } from "@/features/crop-care/pages/Assistant";

export const Route = createFileRoute("/assistant")({
  head: () => ({ meta: pageMeta("Crop Assistant", "Crop Assistant in the offline crop assistant.") }),
  component: AssistantPage,
});
