/**
 * Etiket tarama — geliştirici önizlemesi (simülatör) için örnek veri.
 * Gerçek yanıt şekli: `services/labelScanService` içindeki `LabelScanResult`.
 */
export type LabelIngredientVariant = "normal" | "warning";

export type LabelScanIngredient = {
  name: string;
  tag: string;
  description: string;
  variant: LabelIngredientVariant;
  cautionAmount?: string;
  warningFooter?: string;
};

export type LabelScanResult = {
  productTitle: string;
  summaryLine: string;
  safetyLabel: "safe" | "caution" | "avoid";
  ingredients: LabelScanIngredient[];
  matchedTriggers: {
    filterToken: string;
    filterLabel: string;
    ingredientName: string;
    conditionCodes: string[];
  }[];
  scanId: string;
};

export const MOCK_LABEL_SCAN_RESULT: LabelScanResult = {
  productTitle: "Greek Yogurt with Granola",
  summaryLine: "No ingredients flagged for your health conditions.",
  safetyLabel: "safe",
  matchedTriggers: [],
  scanId: "dev-mock-scan",
  ingredients: [
    {
      name: "Pasteurized Milk",
      tag: "OK",
      description: "No conflict detected with your health profile.",
      variant: "normal",
    },
    {
      name: "Whole Grain Oats",
      tag: "OK",
      description: "No conflict detected with your health profile.",
      variant: "normal",
    },
    {
      name: "Cane Sugar",
      tag: "OK",
      description: "No conflict detected with your health profile.",
      variant: "normal",
    },
    {
      name: "Honey",
      tag: "OK",
      description: "No conflict detected with your health profile.",
      variant: "normal",
    },
    {
      name: "Live Active Cultures",
      tag: "OK",
      description: "No conflict detected with your health profile.",
      variant: "normal",
    },
    {
      name: "Vanilla Extract",
      tag: "OK",
      description: "No conflict detected with your health profile.",
      variant: "normal",
    },
  ],
};
