/** Türkçe karakterleri ASCII’ye indirger (tetik eşlemesi için). */
export function foldTurkishAscii(s: string): string {
  const map: Record<string, string> = {
    ş: 's',
    Ş: 's',
    ğ: 'g',
    Ğ: 'g',
    ü: 'u',
    Ü: 'u',
    ö: 'o',
    Ö: 'o',
    ç: 'c',
    Ç: 'c',
    ı: 'i',
    İ: 'i',
    â: 'a',
    Â: 'a',
    î: 'i',
    Î: 'i',
    û: 'u',
    Û: 'u',
  };
  return s
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .toLowerCase();
}


/** Tetik metni için stabil slug — test.json + DB + resolver aynı mantığı kullanır */
export function ruleTriggerSlug(name: string): string {
  const folded = foldTurkishAscii(name.trim()).replace(/\s+/g, ' ');
  return folded
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '');
}
