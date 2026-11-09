"""Synthetic screenshot generator: 5 layouts x 3 themes x varied fonts/sizes, plus negatives.

Usage: python benchmark/generate --seed 1 --n 300 [--out benchmark/out]

All data is fake: example.com / .test domains, IPs in documentation ranges (RFC 5737) or RFC 1918,
phones in the fictional 555-01xx block. Deterministic: the same seed gives the same HTML, labels.json
and PNGs. Images with an empty label list in labels.json are negatives (decoys or clean screenshots).
The generated set is not committed (benchmark/out is gitignored); script plus seed reproduce it.
"""
import argparse
import html
import json
import random
import string
from pathlib import Path

import numpy as np
from PIL import Image

DOC_NETS = ["192.0.2", "198.51.100", "203.0.113"]
USERS = ["alice", "bob", "carol", "dave", "erin", "frank", "grace", "heidi", "ivan", "judy"]
HOSTS = ["db01", "wiki", "build", "vpn", "files", "mail"]
CMDS = ["ssh", "curl", "ping", "scp", "login", "sudo", "git", "npm"]
FILLER = ["started", "connected", "ok", "retrying", "timeout", "accepted", "denied", "closed"]
WORDS = ["deploy", "status", "report", "backup", "queue", "latency", "restart", "review", "build", "sync"]

LAYOUTS = ["terminal", "siem", "dashboard", "chat", "form"]
THEMES = {
    "dark": ("#0c0c0c", "#d4d4d4", "#1e1e1e", "#333"),
    "light": ("#ffffff", "#1f2328", "#f3f4f6", "#d0d7de"),
    "solarized": ("#fdf6e3", "#586e75", "#eee8d5", "#c9c2a8"),
}
FONTS = [
    ("'Consolas','DejaVu Sans Mono',monospace", [14, 16, 18]),
    ("'Courier New','Liberation Mono',monospace", [14, 16, 20]),
    ("'Segoe UI','DejaVu Sans',Arial,sans-serif", [14, 16, 18]),
    ("Arial,'Liberation Sans',sans-serif", [13, 15, 18]),
]
NEG_RATE = 0.15  # images with decoys only
CLEAN_RATE = 0.05  # images with no sensitive-looking text at all


def alnum(r, n):
    return "".join(r.choice(string.ascii_letters + string.digits) for _ in range(n))


# Each maker returns (text, label_type_or_None).
def m_ip(r):
    return f"{r.choice(DOC_NETS)}.{r.randint(1, 254)}", "ip"


def m_internal_ip(r):
    return f"10.{r.randint(0, 9)}.{r.randint(0, 254)}.{r.randint(1, 254)}", "internal-ip"


def m_email(r):
    return f"{r.choice(USERS)}{r.randint(1, 99)}@example.com", "email"


def m_host(r):
    return f"{r.choice(HOSTS)}{r.randint(1, 9)}.corp.test", "hostname"


def m_url(r):
    return f"https://{r.choice(HOSTS)}.corp.test/{r.choice(WORDS)}", "url"


def m_phone(r):
    return f"+1-202-555-01{r.randint(0, 99):02d}", "phone"


def m_token(r):
    return f"sk_{alnum(r, 24)}", "token"


# Decoys: look sensitive, are not.
def d_version(r):
    return f"{r.randint(1, 9)}.{r.randint(0, 20)}.{r.randint(0, 20)}.{r.randint(0, 9)}", None


def d_uuid(r):
    h = "".join(r.choice("0123456789abcdef") for _ in range(32))
    return f"{h[:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:]}", None


def d_date(r):
    return f"2026-{r.randint(1, 12):02d}-{r.randint(1, 28):02d}", None


def d_hash(r):
    return "".join(r.choice("0123456789abcdef") for _ in range(40)), None


def d_plain(r):
    return r.choice(WORDS), None


POSITIVE = [m_ip, m_ip, m_internal_ip, m_email, m_email, m_host, m_url, m_phone, m_token]
DECOY = [d_version, d_version, d_uuid, d_date, d_hash]


def pick_item(r, mode):
    """mode: 'pos' (mostly sensitive), 'neg' (decoys only), 'clean' (plain words only)."""
    if mode == "clean":
        return d_plain(r)
    if mode == "neg":
        return r.choice(DECOY)(r)
    return (r.choice(POSITIVE) if r.random() < 0.6 else r.choice(DECOY + [d_plain]))(r)


def span(item):
    text, label = item
    attr = f' data-label="{label}"' if label else ""
    return f"<span{attr}>{html.escape(text)}</span>"


def clock(r):
    return f"{r.randint(10, 23)}:{r.randint(10, 59)}:{r.randint(10, 59)}"


def layout_terminal(r, mode):
    lines = []
    for _ in range(r.randint(6, 12)):
        parts = [f"[{clock(r)}]", r.choice(CMDS), "from", span(pick_item(r, mode)), r.choice(FILLER)]
        lines.append(" ".join(parts))
    return "<pre>" + "\n".join(lines) + "</pre>"


def layout_siem(r, mode):
    heads = ["Time", "Source IP", "User", "Action", "Host"]
    rows = []
    for _ in range(r.randint(5, 10)):
        ip = pick_item(r, mode)
        user = m_email(r) if mode == "pos" and r.random() < 0.5 else d_plain(r)
        host = m_host(r) if mode == "pos" and r.random() < 0.5 else d_plain(r)
        rows.append([clock(r), span(ip), span(user), r.choice(FILLER), span(host)])
    th = "".join(f"<th>{h}</th>" for h in heads)
    tr = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in row) + "</tr>" for row in rows)
    return f"<table><tr>{th}</tr>{tr}</table>"


def layout_dashboard(r, mode):
    cards = []
    for _ in range(r.randint(4, 6)):
        cards.append(
            f"<div class=card><div class=k>{r.choice(WORDS)}</div><div class=v>{span(pick_item(r, mode))}</div>"
            f"<div class=s>{r.randint(1, 99)} events</div></div>"
        )
    return "<div class=grid>" + "".join(cards) + "</div>"


def layout_chat(r, mode):
    msgs = []
    for _ in range(r.randint(4, 8)):
        who = r.choice(USERS)
        a, b = r.choice(WORDS), r.choice(WORDS)
        msgs.append(f"<div class=msg><b>{who}</b> {a} {span(pick_item(r, mode))} {b}</div>")
    return "".join(msgs)


def layout_form(r, mode):
    rows = []
    for name in r.sample(["Name", "Contact", "Server", "Address", "Reference", "Notes"], r.randint(3, 5)):
        rows.append(f"<div class=row><label>{name}</label><div class=in>{span(pick_item(r, mode))}</div></div>")
    return "".join(rows)


LAYOUT_FN = {
    "terminal": layout_terminal,
    "siem": layout_siem,
    "dashboard": layout_dashboard,
    "chat": layout_chat,
    "form": layout_form,
}


def css(theme, font, size):
    bg, fg, panel, line = THEMES[theme]
    return (
        f"body{{margin:0;background:{bg};color:{fg};font:{size}px/{int(size * 1.7)}px {font};padding:16px 20px}}"
        f"pre{{margin:0;font:inherit}}span{{display:inline-block;line-height:{int(size * 1.2)}px}}"
        f"table{{border-collapse:collapse}}th,td{{text-align:left;padding:4px 18px 4px 4px;border-bottom:1px solid {line}}}"
        f"th{{background:{panel}}}.grid{{display:grid;grid-template-columns:repeat(3,auto);gap:12px}}"
        f".card{{background:{panel};border:1px solid {line};padding:10px 14px}}.k,.s{{opacity:.7;font-size:.85em}}"
        f".msg{{background:{panel};margin:6px 0;padding:6px 12px;border-radius:8px}}"
        f".row{{display:flex;gap:16px;margin:8px 0}}label{{width:110px;opacity:.7}}"
        f".in{{border:1px solid {line};background:{panel};padding:2px 10px;min-width:260px}}"
    )


def make_image(r):
    """Return (html, meta). Deterministic given r."""
    roll = r.random()
    mode = "clean" if roll < CLEAN_RATE else "neg" if roll < CLEAN_RATE + NEG_RATE else "pos"
    layout = r.choice(LAYOUTS)
    theme = r.choice(list(THEMES))
    font, sizes = r.choice(FONTS)
    size = r.choice(sizes)
    body = LAYOUT_FN[layout](r, mode)
    doc = f"<!doctype html><meta charset=utf-8><style>{css(theme, font, size)}</style>{body}"
    return doc, {"layout": layout, "theme": theme, "font": font, "size": size, "mode": mode}


def ink_box(img, box, thresh=60):
    """Tight bounding box of the glyph ink inside a label's element rectangle.

    OCR boxes hug the ink, so labels must too, or IoU and coverage punish the detector for line padding.
    Background = the rectangle's top-left pixel; ink = any pixel differing from it by more than thresh.
    """
    x0, y0 = max(box["x"], 0), max(box["y"], 0)
    x1, y1 = min(box["x"] + box["w"], img.shape[1]), min(box["y"] + box["h"], img.shape[0])
    if x1 <= x0 or y1 <= y0:
        return box
    crop = img[y0:y1, x0:x1].astype(int)
    diff = np.abs(crop - crop[0, 0]).max(axis=2) > thresh
    ys, xs = np.where(diff)
    if len(xs) == 0:
        return box
    return {"x": int(x0 + xs.min()), "y": int(y0 + ys.min()), "w": int(xs.max() - xs.min() + 1), "h": int(ys.max() - ys.min() + 1)}


THAI_FIRST = ["สมชาย", "สมหญิง", "วิชัย", "สุดา", "ประเสริฐ", "มาลี", "อนันต์", "ปราณี"]
THAI_LAST = ["ใจดี", "รักษา", "สุขสวัสดิ์", "มั่นคง", "พงษ์ไทย", "แก้วมณี"]
THAI_TITLES = ["นาย", "นาง", "นางสาว"]
THAI_FONTS = ["'Leelawadee UI','Tahoma','Noto Sans Thai',sans-serif", "'Tahoma','Leelawadee UI','Noto Sans Thai',sans-serif"]


def thai_id(r):
    d = [r.randint(1, 8)] + [r.randint(0, 9) for _ in range(11)]
    chk = (11 - sum(x * (13 - i) for i, x in enumerate(d)) % 11) % 10
    return "".join(map(str, d + [chk]))


def thai_doc(r):
    """Thai form screenshot: labelled rows, one sensitive value each (synthetic, check-digit-valid ID)."""
    theme = r.choice(list(THEMES))
    font = r.choice(THAI_FONTS)
    size = r.choice([18, 20, 22])
    name = f"{r.choice(THAI_TITLES)} {r.choice(THAI_FIRST)} {r.choice(THAI_LAST)}"
    rows = [
        ("ชื่อ", f'<span data-label="thai-name">{name}</span>'),
        ("เลขบัตร", f'<span data-label="thai-id">{thai_id(r)}</span>'),
        ("โทรศัพท์", f'<span data-label="thai-phone">0{r.choice("689")}{r.randint(0, 9)}-{r.randint(100, 999)}-{r.randint(1000, 9999)}</span>'),
        ("รหัสนักศึกษา", f'<span data-label="thai-student-id">{r.randint(60, 69)}{r.randint(10000000, 99999999) % 100000000:08d}</span>'),
    ]
    body = "".join(f"<div class=row><label>{k}</label><div class=in>{v}</div></div>" for k, v in rows)
    return f"<!doctype html><meta charset=utf-8><style>{css(theme, font, size)}label{{width:160px}}</style>{body}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--thai", type=int, default=0, help="extra Thai-form images (thai-NNN.png), seeded separately")
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--n", type=int, default=300)
    ap.add_argument("--out", default="benchmark/out")
    a = ap.parse_args()
    from playwright.sync_api import sync_playwright

    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    labels, meta = {}, {}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 900, "height": 400}, device_scale_factor=1)
        for i in range(a.n):
            r = random.Random(f"{a.seed}-{i}")
            doc, info = make_image(r)
            page.set_content(doc)
            boxes = page.evaluate(
                """() => [...document.querySelectorAll('[data-label]')].map(e => {
                    const b = e.getBoundingClientRect();
                    return {type: e.dataset.label, box: {x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height)}};
                })"""
            )
            name = f"img-{i:03d}.png"
            page.screenshot(path=str(out / name), full_page=True)
            img = np.array(Image.open(out / name).convert("RGB"))
            for b in boxes:
                b["box"] = ink_box(img, b["box"])
            labels[name] = boxes
            meta[name] = info
        for i in range(a.thai):
            r = random.Random(f"{a.seed}-thai-{i}")
            page.set_content(thai_doc(r))
            boxes = page.evaluate(
                """() => [...document.querySelectorAll('[data-label]')].map(e => {
                    const b = e.getBoundingClientRect();
                    return {type: e.dataset.label, box: {x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height)}};
                })"""
            )
            name = f"thai-{i:03d}.png"
            page.screenshot(path=str(out / name), full_page=True)
            img = np.array(Image.open(out / name).convert("RGB"))
            for b in boxes:
                b["box"] = ink_box(img, b["box"])
            labels[name] = boxes
            meta[name] = {"layout": "thai-form", "mode": "pos"}
        browser.close()
    (out / "labels.json").write_text(json.dumps(labels, indent=1, sort_keys=True) + "\n")
    (out / "meta.json").write_text(json.dumps(meta, indent=1, sort_keys=True) + "\n")
    neg = sum(1 for v in labels.values() if not v)
    print(f"wrote {a.n} images ({neg} negatives) and labels.json to {out}")


main()
