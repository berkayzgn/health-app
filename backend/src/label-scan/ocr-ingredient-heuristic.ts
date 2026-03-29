/**
 * Textract çıktısından içindekiler adaylarını çıkaran kural tabanlı ayrıştırma (LLM yok).
 */

const INGREDIENT_HEADER =
  /(?:^|[\n\r])\s*(içindekiler|ingredients?|zutaten|ingrédients|ingredientes|bestandteile|contiene|contains)\s*[:\s.-]*/i;

/** "İçindekiler:" vb. sonrası metin; bulunamazsa tüm OCR. */
export function sliceAfterIngredientsHeader(ocr: string): string {
  const m = INGREDIENT_HEADER.exec(ocr);
  if (m && m.index !== undefined) {
    return ocr.slice(m.index + m[0].length).trim();
  }
  return ocr.trim();
}

/** İlk anlamlı satırı ürün adı gibi kullan. */
export function guessProductTitle(fullOcr: string): string {
  const lines = fullOcr
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const skip =
    /^(içindekiler|ingredients?|nutrition|besin|energy|enerji|net\s|table|www\.|http)/i;
  for (const line of lines) {
    if (skip.test(line)) continue;
    if (line.length < 2 || line.length > 100) continue;
    if (/^[\d\s.%/]+$/.test(line)) continue;
    return line.length > 80 ? `${line.slice(0, 77)}...` : line;
  }
  return 'Scanned Product';
}

function cleanChunk(chunk: string): string {
  return chunk
    .replace(/^\s*[\d.,]+\s*%?\s*/, '')
    .replace(/\s*\([^)]{0,80}\)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Virgül/noktalı virgül/• ve basit " and " ile böl. */
export function tokenizeIngredientLine(line: string): string[] {
  const parts = line.split(/(?:[,;•]|(?:\s+ve\s+)|(?:\s+and\s+))/i);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    const c = cleanChunk(p);
    if (c.length < 2 || c.length > 180) continue;
    if (seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}

/**
 * OCR metninden küçük harf içindekiler token listesi.
 */
export function extractIngredientsFromOcrHeuristic(ocr: string): string[] {
  const body = sliceAfterIngredientsHeader(ocr);
  const seen = new Set<string>();
  const order: string[] = [];

  const addAll = (arr: string[]) => {
    for (const x of arr) {
      if (!seen.has(x)) {
        seen.add(x);
        order.push(x);
      }
    }
  };

  addAll(tokenizeIngredientLine(body.replace(/\r?\n/g, ' ')));

  if (order.length < 4) {
    for (const line of body.split(/\r?\n/)) {
      const t = line.trim();
      if (t.length < 3) continue;
      addAll(tokenizeIngredientLine(t));
    }
  }

  if (order.length === 0) {
    for (const line of ocr.split(/\r?\n/)) {
      const t = cleanChunk(line);
      if (t.length >= 2 && t.length <= 180) addAll([t]);
    }
  }

  return order.slice(0, 400);
}
