import { createFileRoute } from "@tanstack/react-router";
import { FertilizerCalculatorPage } from "../features/crop-care/pages/FertilizerCalculator";

export const Route = createFileRoute("/calculator")({
  component: FertilizerCalculatorPage,
});

