import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { OnboardingPage } from "@/features/crop-care/pages/Onboarding";

export const Route = createFileRoute("/welcome")({
  head: () => ({ meta: pageMeta("Welcome", "Set up your language, district, season and crops.") }),
  component: OnboardingPage,
});
