#!/usr/bin/env python3
"""Inject label_en, alias.en, and root filter_alias_en into abc.json."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ABC = ROOT / "abc.json"

# key -> (label_en, list of English aliases for condition matching)
CONDITION_EN: dict[str, tuple[str, list[str]]] = {
    "tip_1_diyabet": (
        "Type 1 Diabetes",
        ["Type 1 diabetes mellitus", "T1DM", "IDDM", "insulin-dependent diabetes"],
    ),
    "tip_2_diyabet": (
        "Type 2 Diabetes",
        ["Type 2 diabetes mellitus", "T2DM", "NIDDM", "adult-onset diabetes"],
    ),
    "prediyabet": (
        "Prediabetes",
        ["borderline diabetes", "impaired fasting glucose", "IFG", "IGT"],
    ),
    "gestasyonel_diyabet": (
        "Gestational Diabetes",
        ["GDM", "diabetes in pregnancy", "pregnancy diabetes"],
    ),
    "insulin_direnci": (
        "Insulin Resistance",
        ["IR", "hyperinsulinemia", "metabolic insulin resistance"],
    ),
    "metabolik_sendrom": (
        "Metabolic Syndrome",
        ["Syndrome X", "insulin resistance syndrome", "MetS"],
    ),
    "hipertansiyon": (
        "Hypertension",
        ["high blood pressure", "HBP", "elevated blood pressure"],
    ),
    "koroner_arter_hastaligi": (
        "Coronary Artery Disease",
        ["CAD", "ischemic heart disease", "coronary heart disease", "CHD"],
    ),
    "kalp_yetersizligi": (
        "Heart Failure",
        ["HF", "congestive heart failure", "CHF", "cardiac failure"],
    ),
    "dislipidemi": (
        "Dyslipidemia",
        ["lipid disorder", "abnormal blood lipids"],
    ),
    "yuksek_ldl_kolesterol": (
        "High LDL Cholesterol",
        ["elevated LDL", "high LDL-C", "hypercholesterolemia"],
    ),
    "hipertrigliseridemi": (
        "Hypertriglyceridemia",
        ["high triglycerides", "elevated TG", "severe hypertriglyceridemia"],
    ),
    "kronik_bobrek_hastaligi": (
        "Chronic Kidney Disease",
        ["CKD", "chronic renal disease", "chronic kidney failure"],
    ),
    "diyabetik_bobrek_hastaligi": (
        "Diabetic Kidney Disease",
        ["DKD", "diabetic nephropathy", "diabetic renal disease"],
    ),
    "diyaliz_hastasi": (
        "Dialysis Patient",
        ["on dialysis", "hemodialysis", "peritoneal dialysis", "ESRD on dialysis"],
    ),
    "diyaliz_oncesi_bobrek_yetmezligi": (
        "Pre-dialysis Kidney Failure",
        ["advanced CKD", "CKD before dialysis", "kidney failure not on dialysis"],
    ),
    "urik_asit_tasi": (
        "Uric Acid Kidney Stones",
        ["uric acid stones", "uric acid nephrolithiasis", "urate stones"],
    ),
    "colyak": (
        "Celiac Disease",
        ["coeliac disease", "celiac sprue", "gluten-sensitive enteropathy"],
    ),
    "non_colyak_gluten_hassasiyeti": (
        "Non-Celiac Gluten Sensitivity",
        ["NCGS", "gluten sensitivity", "non-coeliac gluten sensitivity"],
    ),
    "laktoz_intoleransi": (
        "Lactose Intolerance",
        ["lactose malabsorption", "lactase deficiency", "dairy sugar intolerance"],
    ),
    "ibs": (
        "Irritable Bowel Syndrome",
        ["IBS", "spastic colon", "functional bowel disorder"],
    ),
    "gerd": (
        "GERD",
        ["gastroesophageal reflux disease", "acid reflux", "reflux esophagitis"],
    ),
    "crohn_hastaligi": (
        "Crohn's Disease",
        ["Crohn disease", "regional enteritis", "IBD - Crohn"],
    ),
    "ulseratif_kolit": (
        "Ulcerative Colitis",
        ["UC", "IBD - ulcerative colitis"],
    ),
    "fonksiyonel_siskinlik_gaz": (
        "Functional Bloating / Gas",
        ["abdominal bloating", "functional gas", "functional distension"],
    ),
    "masld": (
        "MASLD (Fatty Liver)",
        [
            "metabolic dysfunction-associated steatotic liver disease",
            "NAFLD",
            "fatty liver disease",
        ],
    ),
    "mash": (
        "MASH",
        [
            "metabolic dysfunction-associated steatohepatitis",
            "NASH",
            "steatohepatitis",
        ],
    ),
    "obezite": (
        "Obesity",
        ["severe obesity", "adiposity", "high BMI"],
    ),
    "fazla_kiloluluk": (
        "Overweight",
        ["excess weight", "pre-obesity", "elevated BMI"],
    ),
    "gut": (
        "Gout (Podagra)",
        ["gout", "gouty arthritis", "podagra", "urate arthritis"],
    ),
    "hiperurisemi": (
        "Hyperuricemia",
        ["elevated uric acid", "high serum urate"],
    ),
    "safra_tasi_riski": (
        "Gallstone Risk",
        ["cholelithiasis risk", "gallbladder stone risk", "biliary sludge risk"],
    ),
    "sut_alerjisi": (
        "Cow's Milk Protein Allergy",
        ["CMPA", "milk allergy", "cow milk allergy", "IgE milk allergy"],
    ),
    "yumurta_alerjisi": (
        "Egg Allergy",
        ["egg protein allergy", "hen egg allergy"],
    ),
    "yer_fistigi_alerjisi": (
        "Peanut Allergy",
        ["peanut hypersensitivity", "groundnut allergy"],
    ),
    "agac_yemisleri_alerjisi": (
        "Tree Nut Allergy",
        ["tree nut hypersensitivity", "nuts allergy"],
    ),
    "soya_alerjisi": (
        "Soy Allergy",
        ["soya allergy", "soybean allergy", "soy protein allergy"],
    ),
    "bugday_alerjisi": (
        "Wheat Allergy",
        ["wheat protein allergy", "IgE-mediated wheat allergy"],
    ),
    "balik_alerjisi": (
        "Fish Allergy",
        ["fin fish allergy", "finned fish allergy"],
    ),
    "kabuklu_deniz_urunu_alerjisi": (
        "Shellfish Allergy",
        ["crustacean allergy", "shellfish hypersensitivity", "shrimp allergy"],
    ),
    "susam_alerjisi": (
        "Sesame Allergy",
        ["sesame seed allergy", "tahini allergy"],
    ),
}

# category code -> English display (for optional use)
CATEGORY_EN: dict[str, str] = {
    "metabolic": "Metabolic",
    "cardiovascular": "Cardiovascular",
    "kidney": "Kidney / renal",
    "gluten_intolerance": "Gluten-related",
    "lactose_intolerance": "Lactose intolerance",
    "gastrointestinal": "Gastrointestinal",
    "liver": "Liver",
    "weight_management": "Weight management",
    "purine": "Purine / uric acid",
    "gallbladder": "Gallbladder",
    "food_allergy": "Food allergy",
}

# Manual overrides: token -> (primary English label, extra aliases)
FILTER_OVERRIDES: dict[str, tuple[str, list[str]]] = {
    "ibs": ("IBS", ["irritable bowel"]),
    "gerd": ("GERD", ["reflux"]),
    "masld": ("MASLD", ["NAFLD", "fatty liver"]),
    "mash": ("MASH", ["NASH"]),
    "fodmap": ("FODMAP", ["fermentable oligosaccharides", "high-FODMAP foods"]),
    "gut": ("gout flare foods", ["gout diet"]),
    "cola": ("cola", ["cola soft drink", "phosphoric acid soda"]),
    "dark_cola": ("dark cola", ["cola-type soda", "phosphate additives"]),
    "soy_sauce_wheat": ("wheat-containing soy sauce", ["shoyu with wheat"]),
    "sushi_goma": ("sushi with sesame", ["goma", "sesame-topped sushi"]),
    "seafood_high_purine": ("High-purine seafood", ["anchovy", "sardine", "mackerel", "herring"]),
    "tree_nuts": ("tree nuts", ["tree nut mix"]),
    "nut_paste": ("nut butter / paste", ["nut spreads"]),
    "fish_sauce": ("fish sauce", ["nam pla", "nuoc mam"]),
    "surimi": ("surimi", ["imitation crab", "crab stick"]),
    "worcestershire": ("Worcestershire sauce", ["Worcester sauce"]),
    "rapid_weight_loss": ("rapid weight loss", ["fast weight loss"]),
    "late_night_eating": ("late-night eating", ["night eating"]),
    "water_low": ("low water intake", ["inadequate hydration"]),
    "fasting_long": ("prolonged fasting", ["long fast"]),
    "sugar_fat_combo": ("high sugar and fat meal", ["hyperpalatable foods"]),
    "fat_ratio_high": ("high fat percentage", ["high dietary fat ratio"]),
    "fiber_high": ("high-fiber food", ["high fibre"]),
    "raw_vegetable": ("raw vegetables", ["raw salad", "crudites"]),
    "gas_forming_food": ("gas-forming foods", ["flatulence-producing foods"]),
    "high_meat_intake": ("high meat intake", ["large meat portions"]),
    "charred_meat": ("charred / burnt meat", ["grilled charred meat"]),
    "hidden_milk": ("hidden milk ingredients", ["milk derivatives in labels"]),
    "milk_protein": ("Milk protein", ["casein", "whey protein", "CMP", "milk allergens"]),
    "egg_protein": ("Egg protein", ["ovalbumin", "egg white protein", "egg allergens"]),
    "wheat_protein": ("Wheat protein", ["gliadin", "glutenin", "wheat allergens"]),
    "fish_protein": ("Fish protein", ["parvalbumin", "fin fish allergens"]),
    "shellfish": ("Shellfish", ["crustaceans", "mollusks", "shrimp", "crab", "lobster"]),
    "cross_contamination": ("cross-contamination", ["may contain traces"]),
}


def token_to_english(token: str) -> tuple[str, list[str]]:
    if token in FILTER_OVERRIDES:
        return FILTER_OVERRIDES[token]
    # snake_case -> readable English
    parts = token.split("_")
    # Acronyms and short tokens
    special = {
        "ldl": "LDL",
        "hdl": "HDL",
        "id": "ID",
        "tbsp": "tbsp",
    }
    words = []
    for p in parts:
        low = p.lower()
        if low in special:
            words.append(special[low])
        elif len(p) <= 3 and p.isalpha() and p.isupper():
            words.append(p)
        else:
            words.append(p.replace("_", " ").lower())
    label = " ".join(words)
    # Title case for display phrase
    label = label[0].upper() + label[1:] if label else label
    # Fix common multi-word title
    small = {"and", "or", "per", "with", "of", "in", "a", "an", "the"}
    bits = label.split()
    titled = [
        (b.capitalize() if b.lower() not in small or i == 0 else b.lower())
        for i, b in enumerate(bits)
    ]
    label = " ".join(titled)
    # Simple synonyms from compound
    alias: list[str] = []
    if "_" in token:
        alias.append(token.replace("_", " "))
    return label, alias


def build_filter_glossary(tokens: set[str]) -> dict[str, dict[str, list[str]]]:
    out: dict[str, dict[str, list[str]]] = {}
    for t in sorted(tokens):
        lab, als = token_to_english(t)
        merged = [lab]
        for a in als:
            if a.lower() != lab.lower() and a not in merged:
                merged.append(a)
        out[t] = {"label": lab, "alias": merged[1:] if len(merged) > 1 else als}
    return out


def main() -> None:
    data = json.loads(ABC.read_text(encoding="utf-8"))
    all_filters: set[str] = set()

    for item in data["diseases"]:
        key = item["key"]
        if key not in CONDITION_EN:
            raise SystemExit(f"Missing CONDITION_EN for disease: {key}")
        label_en, aliases = CONDITION_EN[key]
        item["label_en"] = label_en
        item["alias"] = {"en": [label_en] + [a for a in aliases if a.lower() != label_en.lower()]}
        item["category_en"] = CATEGORY_EN.get(item["category"], item["category"])
        all_filters.update(item.get("filters", []))

    for item in data["allergies"]:
        key = item["key"]
        if key not in CONDITION_EN:
            raise SystemExit(f"Missing CONDITION_EN for allergy: {key}")
        label_en, aliases = CONDITION_EN[key]
        item["label_en"] = label_en
        item["alias"] = {"en": [label_en] + [a for a in aliases if a.lower() != label_en.lower()]}
        item["category_en"] = CATEGORY_EN.get(item["category"], item["category"])
        all_filters.update(item.get("filters", []))

    data["filter_alias_en"] = build_filter_glossary(all_filters)

    # Stable JSON output
    text = json.dumps(data, ensure_ascii=False, indent=2)
    ABC.write_text(text + "\n", encoding="utf-8")
    print(f"Wrote {ABC} with label_en, alias.en, category_en, filter_alias_en ({len(all_filters)} filters)")


if __name__ == "__main__":
    main()
