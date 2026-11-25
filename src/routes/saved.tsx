import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { SavedPage } from "@/features/crop-care/pages/Saved";

export const Route = createFileRoute("/saved")({
  head: () => ({ meta: pageMeta("Saved advisories", "Saved advisories in the offline crop assistant.") }),
  component: SavedPage,
});
