import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { HelpPage } from "@/features/crop-care/pages/Help";

export const Route = createFileRoute("/help")({
  head: () => ({ meta: pageMeta("Help and FAQ", "Help and FAQ in the offline crop assistant.") }),
  component: HelpPage,
});
