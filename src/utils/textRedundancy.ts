/**
 * Helper to detect if a secondary details/description/notes text
 * is redundant with the primary bold title or task text.
 * Prevents repeating the same text twice (once bold, once light).
 */
export function isDetailsRedundant(titleOrTask?: string | null, details?: string | null): boolean {
  if (!details || !details.trim()) return true;
  if (!titleOrTask || !titleOrTask.trim()) return false;

  const t = titleOrTask.trim();
  const d = details.trim();

  // Exact match
  if (t === d) return true;

  // Normalize string: remove tashkeel, normalize Arabic letters, remove punctuation & whitespace
  const normalize = (str: string) =>
    str
      .replace(/[\u064B-\u065F\u0670]/g, '') // Arabic diacritics / tashkeel
      .replace(/[إأآا]/g, 'ا')
      .replace(/[ة]/g, 'ه')
      .replace(/[ى]/g, 'ي')
      .replace(/[\s\d\-–.,،():;\\/•|_+!?~"'`#@&]/g, '')
      .replace(/التعرفعلى/g, '')
      .replace(/ورقة|ورق|العمل|الكتاب|المدرسي|كتاب/g, '')
      .toLowerCase();

  const nt = normalize(t);
  const nd = normalize(d);
  if (!nd || nt === nd) return true;
  if (nt.length > 3 && nd.length > 3 && (nt.includes(nd) || nd.includes(nt))) return true;

  // Token-level / Bag-of-words overlap check
  const tokenize = (str: string) =>
    str
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .replace(/[إأآا]/g, 'ا')
      .replace(/[ة]/g, 'ه')
      .replace(/[ى]/g, 'ي')
      .replace(/[^\w\u0600-\u06FF]/g, ' ')
      .split(/\s+/)
      .map((w) => w.trim().toLowerCase())
      .filter(
        (w) =>
          w.length > 2 &&
          !['على', 'من', 'في', 'الى', 'عن', 'مع', 'هذا', 'هذه', 'كل', 'ذلك', 'the', 'and', 'for', 'with', 'page'].includes(w)
      );

  const wordsT = new Set(tokenize(t));
  const wordsD = tokenize(d);

  if (wordsD.length === 0) return true;

  let matchCount = 0;
  for (const w of wordsD) {
    if (wordsT.has(w)) {
      matchCount++;
    } else {
      for (const wt of wordsT) {
        if (wt.includes(w) || w.includes(wt)) {
          matchCount++;
          break;
        }
      }
    }
  }

  // If 45% or more of words in details are already in the bold title/task, suppress details
  const overlapRatio = matchCount / wordsD.length;
  if (overlapRatio >= 0.45) return true;

  return false;
}
