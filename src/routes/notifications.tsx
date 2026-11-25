import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { NotificationsPage } from "@/features/crop-care/pages/Notifications";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: pageMeta("Notifications", "Notifications in the offline crop assistant.") }),
  component: NotificationsPage,
});
