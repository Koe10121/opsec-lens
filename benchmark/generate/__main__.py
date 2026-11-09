"""Synthetic terminal-style screenshot generator.

Usage: python benchmark/generate --seed 1 --n 20 [--out benchmark/out]

All data is fake: emails on example.com, IPs in documentation ranges (RFC 5737).
Deterministic: the same seed gives the same HTML, labels.json and PNGs.
"""
import argparse
import html
import json
import random
from pathlib import Path

DOC_NETS = ["192.0.2", "198.51.100", "203.0.113"]
USERS = ["alice", "bob", "carol", "dave", "erin", "frank", "grace", "heidi", "ivan", "judy"]
CMDS = ["ssh", "curl", "ping", "scp", "login", "sudo", "git", "npm"]
FILLER = ["started", "connected", "ok", "retrying", "timeout", "accepted", "denied", "closed"]

CSS = """body{margin:0;background:#0c0c0c;color:#d4d4d4;font:16px/26px 'Consolas','DejaVu Sans Mono',monospace}
pre{margin:0;padding:16px 20px;white-space:pre}span{display:inline-block;line-height:18px}"""


def fake_ip(r):
    return f"{r.choice(DOC_NETS)}.{r.randint(1, 254)}"


def fake_email(r):
    return f"{r.choice(USERS)}{r.randint(1, 99)}@example.com"


def fake_version(r):
    return f"{r.randint(1, 9)}.{r.randint(0, 20)}.{r.randint(0, 20)}.{r.randint(0, 9)}"


def make_line(r):
    """Return a list of (text, label_type_or_None) tokens."""
    kind = r.choice(["ip", "email", "ip_email", "version", "plain"])
    t = [(f"[{r.randint(10, 23)}:{r.randint(10, 59)}:{r.randint(10, 59)}]", None), (r.choice(CMDS), None)]
    if kind in ("ip", "ip_email"):
        t += [("from", None), (fake_ip(r), "ip")]
    if kind in ("email", "ip_email"):
        t += [("user", None), (fake_email(r), "email")]
    if kind == "version":
        # Negative: four-part version numbers look like IPs but are not.
        t += [("version", None), (fake_version(r), None)]
    t.append((r.choice(FILLER), None))
    return t


def make_image(r, idx):
    """Return (html, expected_labels_count_hint)."""
    lines = [make_line(r) for _ in range(r.randint(6, 12))]
    out = []
    for toks in lines:
        parts = []
        for text, label in toks:
            attr = f' data-label="{label}"' if label else ""
            parts.append(f"<span{attr}>{html.escape(text)}</span>")
        out.append(" ".join(parts))
    body = "\n".join(out)
    return f"<!doctype html><meta charset=utf-8><style>{CSS}</style><pre>{body}</pre>"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--n", type=int, default=20)
    ap.add_argument("--out", default="benchmark/out")
    a = ap.parse_args()
    from playwright.sync_api import sync_playwright

    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    labels = {}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 900, "height": 400}, device_scale_factor=1)
        for i in range(a.n):
            r = random.Random(f"{a.seed}-{i}")
            doc = make_image(r, i)
            page.set_content(doc)
            boxes = page.evaluate(
                """() => [...document.querySelectorAll('[data-label]')].map(e => {
                    const b = e.getBoundingClientRect();
                    return {type: e.dataset.label, box: {x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height)}};
                })"""
            )
            name = f"img-{i:03d}.png"
            page.screenshot(path=str(out / name), full_page=True)
            labels[name] = boxes
        browser.close()
    (out / "labels.json").write_text(json.dumps(labels, indent=1, sort_keys=True) + "\n")
    print(f"wrote {a.n} images and labels.json to {out}")


main()
