import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { HomePage } from "@/features/crop-care/pages/Home";

export const Route = createFileRoute("/")({
  head: () => ({ meta: pageMeta("Home", "Home in the offline crop assistant.") }),
  component: HomePage,
});
