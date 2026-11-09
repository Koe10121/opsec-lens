import type { Detector } from './types';

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;

export const emailDetector: Detector = (words) =>
  words
    .filter((w) => EMAIL.test(w.text))
    .map((w) => ({ type: 'email', box: w.box, confidence: 0.95, source: 'rules' as const }));
