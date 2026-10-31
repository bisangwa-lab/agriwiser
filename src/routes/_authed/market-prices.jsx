import { createFileRoute } from "@tanstack/react-router";
import MarketPricesPanel from "@/components/community/MarketPricesPanel";

export const Route = createFileRoute("/_authed/market-prices")({
  head: () => ({ meta: [{ title: "Market Prices & Trends · AgriWiser" }] }),
  component: MarketPricesPanel,
});
