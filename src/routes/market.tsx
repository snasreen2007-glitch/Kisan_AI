import { createFileRoute } from "@tanstack/react-router";
import { MarketPricesPage } from "../features/crop-care/pages/MarketPrices";

export const Route = createFileRoute("/market")({
  component: MarketPricesPage,
});

