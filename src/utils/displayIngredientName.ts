/**
 * Tarama / AI çıktısından gelen metindeki anlamsız JSON/HTML benzeri kalıntıları sadeleştirir.
 * İçerik anlamını bozmadan yalnızca görüntü gürültüsünü azaltır.
 */
export function sanitizeScanDisplayText(raw: string): string {
  let s = String(raw ?? "").trim();
  if (!s) return "";

  s = s.replace(/[\u201C\u201D\u2018\u2019\u00AB\u00BB]/g, '"');
  s = s.replace(/["'`]+/g, "");
  s = s.replace(/[\[\]{}]/g, "");
  s = s.replace(/\s*[,;]\s*/g, ", ");
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/^[,;:\s]+|[,;:\s]+$/g, "");

  return s;
}

/** Görüntüleme için sadeleştirme + basit baş harf büyütme (API küçük harf dönebilir). */
export function displayIngredientName(name: string): string {
  const t = sanitizeScanDisplayText(name);
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}
