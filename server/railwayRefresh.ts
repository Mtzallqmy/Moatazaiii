import "dotenv/config";
import { refreshPublicIndexForExternalScheduler } from "./scheduledRefresh";

const rawLimit = Number.parseInt(process.env.INDEX_REFRESH_LIMIT ?? "20", 10);
const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 25) : 20;

async function main() {
  try {
    const result = await refreshPublicIndexForExternalScheduler(limit);
    console.log(JSON.stringify({ event: "public-index-refresh", ...result }));
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown refresh error";
    console.error(JSON.stringify({ event: "public-index-refresh", error: message }));
    process.exit(1);
  }
}

void main();
