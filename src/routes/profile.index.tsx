import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { ProfilePage } from "@/features/crop-care/pages/Profile";

export const Route = createFileRoute("/profile/")({
  head: () => ({ meta: pageMeta("Profile", "Profile in the offline crop assistant.") }),
  component: ProfilePage,
});
