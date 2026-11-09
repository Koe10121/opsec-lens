export type Box = { x: number; y: number; w: number; h: number };
export type Word = { text: string; box: Box; conf: number };
export type Finding = {
  type: string;
  box: Box;
  confidence: number;
  source: 'rules' | 'layout' | 'model' | 'manual';
};
export type Context = Record<string, unknown>;
export type Detector = (words: Word[], ctx: Context) => Finding[];

export function runDetectors(words: Word[], enabled: Detector[], ctx: Context = {}): Finding[] {
  return enabled.flatMap((d) => d(words, ctx));
}
