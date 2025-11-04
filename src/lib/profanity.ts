const DEFAULT_PATTERNS = [
  /fuck/gi,
  /shit/gi,
  /bitch/gi,
  /cunt/gi,
  /dick/gi,
  /piss/gi,
  /asshole/gi,
  /bastard/gi,
  /slut/gi,
  /whore/gi,
  /nigger/gi,
  /nigga/gi,
  /spic/gi,
  /kike/gi,
];

function maskWord(word: string) {
  if (!word) return '';
  if (word.length <= 2) return '*'.repeat(word.length);
  const first = word[0];
  const last = word[word.length - 1];
  return `${first}${'*'.repeat(word.length - 2)}${last}`;
}

export function filterProfanity(input: string, patterns: RegExp[] = DEFAULT_PATTERNS) {
  if (!input) return { clean: input, flagged: false };
  let output = input;
  let flagged = false;

  for (const pattern of patterns) {
    output = output.replace(pattern, (match) => {
      flagged = true;
      return maskWord(match);
    });
  }

  return { clean: output, flagged };
}

