export const GENERIC_PHRASES = [
  "in today's fast-paced world", "in this day and age", "game changer", "game-changer",
  "it is important to note", "needless to say", "at the end of the day",
  "in conclusion", "unlock the power of", "take it to the next level",
  "in the ever-evolving", "paradigm shift", "synergy", "leverage the power of",
  "dive deep into", "let's dive in", "without further ado", "in a nutshell",
  "the future is here", "revolutionize the way", "disrupt the industry",
];

export interface VoiceResult {
  score: number;
  flags: { type: 'warn' | 'good'; msg: string }[];
}

export function analyzeVoice(text: string) {
  const flags: { type: 'warn' | 'good'; msg: string }[] = [];
  let score = 100;
  const lower = text.toLowerCase();

  // 1. Detect Generic AI-isms
  const hits = GENERIC_PHRASES.filter(p => lower.includes(p));
  if (hits.length) {
    score -= hits.length * 12;
    flags.push({ type: 'warn', msg: `AI phrase detected: "${hits[0]}"` });
  }

  // 2. Detect Unfilled Placeholders (e.g., [Insert Name])
  const placeholders = text.match(/\[[^\]]+\]/g);
  if (placeholders && placeholders.length) {
    score -= placeholders.length * 15;
    flags.push({ type: 'warn', msg: `${placeholders.length} unfilled placeholder(s) found` });
  }

  // 3. Check for First-Person Perspective (Human signal)
  const hasFirstPerson = /\b(i|i've|i'm|my|we've|our)\b/i.test(text);
  if (!hasFirstPerson) {
    score -= 15;
    flags.push({ type: 'warn', msg: 'Reads like a summary; try adding a personal "I" or "We" perspective' });
  } else {
    flags.push({ type: 'good', msg: 'Good use of personal perspective' });
  }

  // 4. Sentence Length Variance (Robots use same length sentences)
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 3);
  if (sentences.length >= 3) {
    const lens = sentences.map(s => s.split(/\s+/).length);
    const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
    const variance = lens.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / lens.length;
    if (variance < 5) {
      score -= 10;
      flags.push({ type: 'warn', msg: 'Sentence lengths are too uniform (sounds robotic)' });
    }
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    flags
  };
}