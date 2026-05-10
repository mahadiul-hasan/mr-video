// app/actions/cache-client.ts
"use server";

// Re-export all functions for client use
export {
  getCacheStatistics,
  clearCache,
  getSystemMetrics,
  getCacheKeyDetails,
  getCacheTTLDistribution,
} from "./cache";
