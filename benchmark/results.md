# Benchmark results

300 images, synthetic data, IoU >= 0.5, same type. "Fully covered" = at least 95% of a labelled item is hidden by the union of findings.
60 negative images, 29 with at least one false positive (all false positives count against precision).

## Summary

| Method | Recall | Precision | Fully covered |
|---|---|---|---|
| rules-only | 69.2% | 76.6% | 69.8% |
| rules + heuristics | 69.2% | 64.3% | 82.1% |

## Method: rules-only

| Detector | TP | FP | FN | Recall | Precision | Fully covered |
|---|---|---|---|---|---|---|
| email | 246 | 9 | 102 | 70.7% | 96.5% | 72.1% |
| hostname | 161 | 9 | 115 | 58.3% | 94.7% | 55.1% |
| internal-ip | 76 | 0 | 21 | 78.4% | 100.0% | 83.5% |
| ip | 167 | 236 | 35 | 82.7% | 41.4% | 85.6% |
| phone | 77 | 5 | 17 | 81.9% | 93.9% | 84.0% |
| token | 75 | 2 | 34 | 68.8% | 97.4% | 68.8% |
| url | 54 | 1 | 57 | 48.6% | 98.2% | 46.8% |

## Method: rules + heuristics

| Detector | TP | FP | FN | Recall | Precision | Fully covered |
|---|---|---|---|---|---|---|
| column | 0 | 214 | 0 | n/a | 0.0% | n/a |
| email | 246 | 9 | 102 | 70.7% | 96.5% | 84.8% |
| hostname | 161 | 9 | 115 | 58.3% | 94.7% | 80.1% |
| internal-ip | 76 | 0 | 21 | 78.4% | 100.0% | 87.6% |
| ip | 167 | 236 | 35 | 82.7% | 41.4% | 89.1% |
| phone | 77 | 5 | 17 | 81.9% | 93.9% | 89.4% |
| token | 75 | 2 | 34 | 68.8% | 97.4% | 75.2% |
| url | 54 | 1 | 57 | 48.6% | 98.2% | 62.2% |

Note: `column` findings are whole-column boxes with no matching column labels, so they count as false positives in precision. The honest gain from heuristics is the "Fully covered" column.

## VLM spike (issue 017, offline)

Run on a 60-image subset (every 5th non-Thai image), local Ollama, `gemma3:12b` (8.2 GB), RTX 5070 Laptop 8 GB.
Full per-detector tables: `results-vlm.md`. Reproduce: `npx tsx benchmark/vlm/query.ts` then `npx tsx benchmark/vlm/score.ts`.

| Method (60-image subset) | Recall | Precision | Fully covered |
|---|---|---|---|
| rules + heuristics | 70.5% | 63.5% | 80.7% |
| model-only (gemma3:12b) | 57.0% | 64.1% | 59.0% |
| combined (heuristics + model) | 73.8% | 36.9% | 82.0% |

Median 8.4 s per image. Decision: do not ship (see `issues/done/017-vlm-spike-offline.md`).
