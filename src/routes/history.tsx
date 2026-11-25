import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { HistoryPage } from "@/features/crop-care/pages/History";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: pageMeta("Scan history", "Scan history in the offline crop assistant.") }),
  component: HistoryPage,
});
