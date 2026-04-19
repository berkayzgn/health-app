/** Görüntüleme için basit baş harf büyütme (API küçük harf dönebilir). */
export function displayIngredientName(name: string): string {
  const t = name.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}
