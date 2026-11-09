# Benchmark results

60 images, synthetic data, IoU >= 0.5, same type. "Fully covered" = at least 95% of a labelled item is hidden by the union of findings.
13 negative images, 9 with at least one false positive (all false positives count against precision).

## Summary

| Method | Recall | Precision | Fully covered |
|---|---|---|---|
| rules + heuristics | 70.5% | 63.5% | 80.7% |
| VLM only (gemma3:12b) | 57.0% | 64.1% | 59.0% |
| combined (heuristics + VLM) | 73.8% | 36.9% | 82.0% |

## Method: rules + heuristics

| Detector | TP | FP | FN | Recall | Precision | Fully covered |
|---|---|---|---|---|---|---|
| column | 0 | 43 | 0 | n/a | 0.0% | n/a |
| email | 41 | 1 | 21 | 66.1% | 97.6% | 79.0% |
| hostname | 29 | 3 | 20 | 59.2% | 90.6% | 71.4% |
| internal-ip | 16 | 0 | 4 | 80.0% | 100.0% | 90.0% |
| ip | 43 | 51 | 8 | 84.3% | 45.7% | 92.2% |
| phone | 19 | 1 | 2 | 90.5% | 95.0% | 95.2% |
| token | 10 | 0 | 7 | 58.8% | 100.0% | 64.7% |
| url | 14 | 0 | 10 | 58.3% | 100.0% | 70.8% |

## Method: VLM only (gemma3:12b)

| Detector | TP | FP | FN | Recall | Precision | Fully covered |
|---|---|---|---|---|---|---|
| date | 0 | 1 | 0 | n/a | 0.0% | n/a |
| email | 32 | 5 | 30 | 51.6% | 86.5% | 51.6% |
| hostname | 20 | 37 | 29 | 40.8% | 35.1% | 44.9% |
| internal-ip | 16 | 0 | 4 | 80.0% | 100.0% | 80.0% |
| ip | 39 | 32 | 12 | 76.5% | 54.9% | 82.4% |
| phone | 19 | 0 | 2 | 90.5% | 100.0% | 90.5% |
| token | 0 | 1 | 17 | 0.0% | 0.0% | 0.0% |
| url | 13 | 2 | 11 | 54.2% | 86.7% | 54.2% |

## Method: combined (heuristics + VLM)

| Detector | TP | FP | FN | Recall | Precision | Fully covered |
|---|---|---|---|---|---|---|
| column | 0 | 43 | 0 | n/a | 0.0% | n/a |
| date | 0 | 1 | 0 | n/a | 0.0% | n/a |
| email | 41 | 38 | 21 | 66.1% | 51.9% | 79.0% |
| hostname | 35 | 54 | 14 | 71.4% | 39.3% | 75.5% |
| internal-ip | 16 | 16 | 4 | 80.0% | 50.0% | 90.0% |
| ip | 43 | 122 | 8 | 84.3% | 26.1% | 92.2% |
| phone | 20 | 19 | 1 | 95.2% | 51.3% | 95.2% |
| token | 10 | 1 | 7 | 58.8% | 90.9% | 64.7% |
| url | 15 | 14 | 9 | 62.5% | 51.7% | 75.0% |

Subset: every 5th non-Thai image (60 images). VLM latency on RTX 5070 Laptop (8 GB), Ollama: median 8.4s per image.
Note: a VLM-"only" row is the VLM naming strings that OCR then locates, so OCR misses cap its recall.
