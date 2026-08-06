/**
 * Normalizes text for profanity matching (lowercase, strip diacritics, collapse spaces).
 */
function normalizeForProfanity(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(
      /[^a-z0-9\u0400-\u04ff\u00e7\u011f\u0131\u00f6\u015f\u00fc\u0259\u0131\u015f\u011f\u00fc\u00f6\u00e7]+/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

/** Common profanity across TR, EN, AZ, RU (partial list — extend as needed). */
const BLOCKED_TERMS = [
  // English
  "fuck",
  "fucking",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "cunt",
  "dick",
  "pussy",
  "whore",
  "slut",
  "nigger",
  "faggot",
  // Turkish
  "amk",
  "amına",
  "amina",
  "sik",
  "siktir",
  "orospu",
  "piç",
  "pic",
  "göt",
  "got",
  "yarrak",
  "kahpe",
  "mal",
  "salak",
  "aptal",
  // Azerbaijani
  "sikim",
  "sikdir",
  "qanciq",
  "qancıq",
  "peysər",
  "peyser",
  "lənət",
  "lanet",
  // Russian (transliterated + cyrillic)
  "blyad",
  "blyat",
  "сука",
  "бляд",
  "блять",
  "хуй",
  "пизд",
  "ебан",
  "ебат",
  "мудак",
  "мудak",
];

const BLOCKED_SET = new Set(BLOCKED_TERMS.map(normalizeForProfanity));

export class ProfanityError extends Error {
  constructor(message = "Message contains prohibited language") {
    super(message);
    this.name = "ProfanityError";
  }
}

/**
 * Returns true if the message contains blocked profanity in any supported language.
 */
export function containsProfanity(message: string): boolean {
  const normalized = normalizeForProfanity(message);
  if (!normalized) return false;

  const tokens = normalized.split(" ");
  for (const token of tokens) {
    if (BLOCKED_SET.has(token)) return true;
    for (const term of BLOCKED_TERMS) {
      const normTerm = normalizeForProfanity(term);
      if (normTerm.length >= 3 && token.includes(normTerm)) return true;
    }
  }

  for (const term of BLOCKED_TERMS) {
    const normTerm = normalizeForProfanity(term);
    if (normTerm.length >= 4 && normalized.includes(normTerm)) return true;
  }

  return false;
}

export function assertNoProfanity(message: string): void {
  if (containsProfanity(message)) {
    throw new ProfanityError();
  }
}
