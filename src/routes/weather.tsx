import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { WeatherPlannerPage } from "@/features/crop-care/pages/WeatherPlanner";

export const Route = createFileRoute("/weather")({
  head: () => ({
    meta: pageMeta("Weather & Spray Window Planner", "Microclimate spray safety and disease outbreak risk forecasting."),
  }),
  component: WeatherPlannerPage,
});

