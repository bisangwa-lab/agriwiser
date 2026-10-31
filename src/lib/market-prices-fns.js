import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/auth-middleware";
import { getMarketPriceViewForUser } from "@/lib/market-prices-data.server";

function validateInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw Object.assign(new Error("Choose valid market price filters."), { status: 400 });
  }
  return input;
}

export const getMarketPriceView = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .validator(validateInput)
  .handler(({ context, data }) => getMarketPriceViewForUser(context.user, data));
