import { createEngine } from "./controller";
import type {
  MonetizationAd,
  MonetizationResult,
  MonetizationSettings,
} from "./types";

export function initAdEngine(props: {
  ads: MonetizationAd[];
  settings: MonetizationSettings;
  onEvent?: (event: MonetizationResult) => void;
}) {
  return createEngine(props);
}
