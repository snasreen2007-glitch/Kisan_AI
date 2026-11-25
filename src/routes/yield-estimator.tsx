import { createFileRoute } from "@tanstack/react-router";
import { YieldEstimatorPage } from "../features/crop-care/pages/YieldEstimator";

export const Route = createFileRoute("/yield-estimator")({
  component: YieldEstimatorPage,
});

