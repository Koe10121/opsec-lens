# Benchmark results

30 images, synthetic data, IoU >= 0.5, same type. "Fully covered" = at least 95% of a labelled item is hidden by the union of findings.
5 negative images, 3 with at least one false positive (all false positives count against precision).

## Summary

| Method | Recall | Precision | Fully covered |
|---|---|---|---|
| rules-only | 36.0% | 65.1% | 41.2% |
| rules + heuristics | 36.0% | 51.2% | 58.8% |
| rules + heuristics + thai | 58.8% | 62.0% | 71.1% |

## Method: rules-only

| Detector | TP | FP | FN | Recall | Precision | Fully covered |
|---|---|---|---|---|---|---|
| email | 10 | 0 | 11 | 47.6% | 100.0% | 47.6% |
| hostname | 10 | 0 | 11 | 47.6% | 100.0% | 42.9% |
| internal-ip | 2 | 0 | 2 | 50.0% | 100.0% | 50.0% |
| ip | 7 | 14 | 0 | 100.0% | 33.3% | 100.0% |
| phone | 2 | 7 | 1 | 66.7% | 22.2% | 66.7% |
| thai-id | 0 | 0 | 10 | 0.0% | n/a | 0.0% |
| thai-name | 0 | 0 | 10 | 0.0% | n/a | 0.0% |
| thai-phone | 0 | 0 | 10 | 0.0% | n/a | 70.0% |
| thai-student-id | 0 | 0 | 10 | 0.0% | n/a | 0.0% |
| token | 6 | 1 | 3 | 66.7% | 85.7% | 66.7% |
| url | 4 | 0 | 5 | 44.4% | 100.0% | 44.4% |

## Method: rules + heuristics

| Detector | TP | FP | FN | Recall | Precision | Fully covered |
|---|---|---|---|---|---|---|
| column | 0 | 17 | 0 | n/a | 0.0% | n/a |
| email | 10 | 0 | 11 | 47.6% | 100.0% | 90.5% |
| hostname | 10 | 0 | 11 | 47.6% | 100.0% | 66.7% |
| internal-ip | 2 | 0 | 2 | 50.0% | 100.0% | 50.0% |
| ip | 7 | 14 | 0 | 100.0% | 33.3% | 100.0% |
| phone | 2 | 7 | 1 | 66.7% | 22.2% | 100.0% |
| thai-id | 0 | 0 | 10 | 0.0% | n/a | 0.0% |
| thai-name | 0 | 0 | 10 | 0.0% | n/a | 0.0% |
| thai-phone | 0 | 0 | 10 | 0.0% | n/a | 70.0% |
| thai-student-id | 0 | 0 | 10 | 0.0% | n/a | 0.0% |
| token | 6 | 1 | 3 | 66.7% | 85.7% | 88.9% |
| url | 4 | 0 | 5 | 44.4% | 100.0% | 77.8% |

## Method: rules + heuristics + thai

| Detector | TP | FP | FN | Recall | Precision | Fully covered |
|---|---|---|---|---|---|---|
| column | 0 | 17 | 0 | n/a | 0.0% | n/a |
| email | 10 | 0 | 11 | 47.6% | 100.0% | 90.5% |
| hostname | 10 | 0 | 11 | 47.6% | 100.0% | 66.7% |
| internal-ip | 2 | 0 | 2 | 50.0% | 100.0% | 50.0% |
| ip | 7 | 14 | 0 | 100.0% | 33.3% | 100.0% |
| phone | 2 | 7 | 1 | 66.7% | 22.2% | 100.0% |
| thai-id | 7 | 0 | 3 | 70.0% | 100.0% | 70.0% |
| thai-name | 5 | 2 | 5 | 50.0% | 71.4% | 0.0% |
| thai-phone | 7 | 0 | 3 | 70.0% | 100.0% | 70.0% |
| thai-student-id | 7 | 0 | 3 | 70.0% | 100.0% | 70.0% |
| token | 6 | 1 | 3 | 66.7% | 85.7% | 88.9% |
| url | 4 | 0 | 5 | 44.4% | 100.0% | 77.8% |

Note: `thai-*` rows come from the Thai form variants (eng+tha OCR); `thai-name` is best effort (title + two Thai words), so read its numbers as indicative.
Note: `column` findings are whole-column boxes with no matching column labels, so they count as false positives in precision. The honest gain from heuristics is the "Fully covered" column.
