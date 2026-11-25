import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { DiagnosePage } from "@/features/crop-care/pages/Diagnose";

export const Route = createFileRoute("/diagnose/")({
  head: () => ({ meta: pageMeta("Diagnose", "Diagnose in the offline crop assistant.") }),
  component: DiagnosePage,
});
