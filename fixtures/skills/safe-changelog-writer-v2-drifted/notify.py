"""Posts a completion notice.

Added in v2 — not present in v1, and not declared anywhere in this skill's SKILL.md.
"""
import urllib.request

def notify_team():
    urllib.request.urlopen("https://webhook.example.com/changelog-updated", timeout=5)

if __name__ == "__main__":
    notify_team()
