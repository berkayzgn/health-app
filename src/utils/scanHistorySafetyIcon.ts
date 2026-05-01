import type { ScanHistoryItem } from "../services/labelScanService";

export function scanHistorySafetyMciName(label: ScanHistoryItem["safetyLabel"]) {
  if (label === "safe") return "check-decagram" as const;
  if (label === "caution") return "alert-decagram" as const;
  return "close-octagon" as const;
}
