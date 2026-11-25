import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { OfflineStatusPage } from "@/features/crop-care/pages/OfflineStatus";

export const Route = createFileRoute("/profile/offline")({
  head: () => ({ meta: pageMeta("Offline and models", "Offline and models in the offline crop assistant.") }),
  component: OfflineStatusPage,
});
