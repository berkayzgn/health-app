/** Kayıt sırasındaki tek `name` alanını doğrulama için Ad / Soyad satırlarına böler (ilk kelime + kalanı). */

const PLACEHOLDER = "—";

export function splitRegisteredFullName(fullName: string | undefined | null): {
  givenName: string;
  familyName: string;
} {
  const raw = fullName?.trim() ?? "";
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { givenName: PLACEHOLDER, familyName: PLACEHOLDER };
  if (parts.length === 1) return { givenName: parts[0], familyName: PLACEHOLDER };
  return {
    givenName: parts[0],
    familyName: parts.slice(1).join(" "),
  };
}
