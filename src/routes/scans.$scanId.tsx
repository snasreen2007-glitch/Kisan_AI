import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { ScanResultPage } from "@/features/crop-care/pages/ScanResult";

export const Route = createFileRoute("/scans/$scanId")({
  head: () => ({ meta: pageMeta("Scan result", "Scan result in the offline crop assistant.") }),
  component: ScanResultPage,
});
