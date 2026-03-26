/**
 * Etiket tarama — AI yanıtı yokken kullanılan örnek veri (tasarım önizlemesi).
 * Gerçek API bağlanınca bu yapıya map edilebilir.
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
  glycemicImpact: string;
  processingGrade: string;
  ingredients: LabelScanIngredient[];
};

export const MOCK_LABEL_SCAN_RESULT: LabelScanResult = {
  productTitle: "Greek Yogurt with Granola",
  summaryLine:
    "Based on your metabolic profile and recent glucose trends, this item is categorized as:",
  safetyLabel: "safe",
  glycemicImpact: "Low",
  processingGrade: "Minimal",
  ingredients: [
    {
      name: "Pasteurized Milk",
      tag: "Probiotic Source",
      description:
        "High-quality source of calcium and essential proteins. No hormonal additives detected.",
      variant: "normal",
    },
    {
      name: "Whole Grain Oats",
      tag: "Complex Carb",
      description:
        "Slow-digesting fiber which helps maintain steady blood sugar levels throughout the day.",
      variant: "normal",
    },
    {
      name: "Cane Sugar",
      tag: "Caution",
      description:
        "Added sugars can spike glucose. Amount in this serving:",
      variant: "warning",
      cautionAmount: "4.2g",
      warningFooter: "Potential metabolic disruption",
    },
    {
      name: "Honey",
      tag: "Natural Sweetener",
      description:
        "Contains antioxidants. Use in moderation as part of the total daily carb allowance.",
      variant: "normal",
    },
    {
      name: "Live Active Cultures",
      tag: "Microbiome",
      description:
        "S. Thermophilus, L. Bulgaricus. Beneficial for gut health and digestion efficiency.",
      variant: "normal",
    },
    {
      name: "Vanilla Extract",
      tag: "Flavoring",
      description:
        "Pure natural extract. No synthetic vanillin detected in chemical signature scan.",
      variant: "normal",
    },
  ],
};
