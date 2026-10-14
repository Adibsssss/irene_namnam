#!/usr/bin/env python3
"""Run from the project root: python3 retheme.py
Literal find/replace; aborts loudly if any expected text is missing."""
import os, pathlib

def sub(path, pairs):
    p = pathlib.Path(path)
    s = p.read_text()
    for old, new in pairs:
        if old not in s:
            raise SystemExit(f"{path}: expected text not found: {old!r}")
        s = s.replace(old, new)
    p.write_text(s)

sub("tailwind.config.ts", [
    ('ink: "#1b2a52"', 'ink: "#3b4a3a"'),
    ('paper: "#f6f9ff"', 'paper: "#faf7f0"'),
    ('line: "#dce6f7"', 'line: "#e4dfd0"'),
    ('muted: "#5c6b8c"', 'muted: "#7a8570"'),
    ('coral: "#d9a63e"', 'coral: "#7d9a7a"'),
    ('peach: "#f0c4bc"', 'peach: "#eadfc9"'),
    ('butter: "#8fc3ec"', 'butter: "#d9ceb2"'),
    ('sage: "#9fc7b8"', 'sage: "#a9c0a4"'),
    ('plum: "#14204a"', 'plum: "#2f3d2f"'),
    ('rose: "#d98f76"', 'rose: "#c9a88a"'),
    ("rgba(217,166,62,0.5)", "rgba(125,154,122,0.5)"),
    ("rgba(217,166,62,0)", "rgba(125,154,122,0)"),
])
sub("app/layout.tsx", [
    ("Kai’s Dedication & Birthday Gallery", "Nam-Nam & Irish — Wedding Gallery"),
    ("Celebrate Kai's dedication and birthday with every photo from the day.",
     "Share and relive every moment from Nam-Nam & Irish's wedding day."),
    ('themeColor: "#f6f9ff"', 'themeColor: "#faf7f0"'),
])
sub("app/page.tsx", [
    ('import { BirthdayHero } from "@/components/BirthdayHero";',
     'import { WeddingHero } from "@/components/WeddingHero";'),
    ("<BirthdayHero />", "<WeddingHero />"),
    ("Kai&apos;s Birthday &amp; Dedication", "Nam-Nam &amp; Irish"),
    ("Moments, together", "Our day, through your eyes"),
])
sub("components/Onboarding.tsx", [
    ("#3979b7", "#6f8a6b"), ("#cfe8fb", "#dfe8d9"),
    ("#5b9bd5", "#7d9a7a"), ("#d8edfc", "#e6eddf"),
])
for f in ("components/UploadButton.tsx", "components/UploadProgress.tsx", "components/PhotoCard.tsx"):
    sub(f, [("rgba(30,42,120,", "rgba(47,61,47,")])
sub("components/Lightbox.tsx", [
    ("bg-[#b9def5]", "bg-[#e4eadc]"),
    ("bg-[#dcefff]/65", "bg-[#f3efe4]/65"),
    ("rgba(35,92,139,0.28)", "rgba(47,61,47,0.25)"),
    ("text-white/70", "text-ink/70"),
])
sub("hooks/useOnboarding.ts", [("onboarded-v3", "wedding-v1")])

if os.path.exists("components/BirthdayHero.tsx"):
    os.remove("components/BirthdayHero.tsx")
for old in ("public/party-frame.png", "public/hero-baby.jpg"):
    if os.path.exists(old):
        os.remove(old)
print("Retheme applied.")
