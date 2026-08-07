#!/usr/bin/env python3
"""
Lista TUTTI i remote trigger di claude.ai, paginando correttamente.

Perché esiste: il tool RemoteTrigger del binario claude-code, nel caso `list`,
costruisce la URL come `/v1/code/triggers` e SCARTA il body — quindi il `cursor`
non viene mai accodato e la paginazione è impossibile (ritorna sempre pagina 1).
Questo script chiama l'endpoint direttamente con `?cursor=`, ciclando su `has_more`.

Auth: legge il token OAuth claude.ai dal Keychain macOS (stesso che usa l'app).
Se scaduto, lo rinfresca via refresh_token e riscrive il Keychain (come fa l'app).

Uso:
    python3 scripts/list-triggers.py            # tutti i trigger (nome + next_run)
    python3 scripts/list-triggers.py --json     # JSON grezzo completo
    python3 scripts/list-triggers.py --grep god # filtra per sottostringa nel nome
"""
from __future__ import annotations

import json
import subprocess
import sys
import time
import urllib.parse
import urllib.request

KEYCHAIN_SERVICE = "Claude Code-credentials"
API_BASE = "https://api.anthropic.com"
TOKEN_URL = "https://platform.claude.com/v1/oauth/token"
CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e"
BETA = "oauth-2025-04-20"
# Il WAF di Anthropic risponde 403 allo User-Agent di urllib: serve un UA "vero".
USER_AGENT = "vault-tracker-triggers/1.0 (+local script)"


def keychain_read() -> dict:
    out = subprocess.run(
        ["security", "find-generic-password", "-s", KEYCHAIN_SERVICE, "-w"],
        capture_output=True, text=True, check=True,
    ).stdout
    return json.loads(out)


def keychain_write(creds: dict) -> None:
    # -U aggiorna l'item esistente; -w passa la password (il blob JSON)
    subprocess.run(
        ["security", "add-generic-password", "-U",
         "-s", KEYCHAIN_SERVICE,
         "-a", KEYCHAIN_SERVICE,
         "-w", json.dumps(creds)],
        check=True,
    )


def refresh(creds: dict) -> dict:
    oauth = creds["claudeAiOauth"]
    body = json.dumps({
        "grant_type": "refresh_token",
        "refresh_token": oauth["refreshToken"],
        "client_id": CLIENT_ID,
    }).encode()
    req = urllib.request.Request(
        TOKEN_URL, data=body,
        headers={"Content-Type": "application/json", "User-Agent": USER_AGENT},
        method="POST",
    )
    with urllib.request.urlopen(req) as r:
        tok = json.load(r)
    oauth["accessToken"] = tok["access_token"]
    if tok.get("refresh_token"):
        oauth["refreshToken"] = tok["refresh_token"]
    oauth["expiresAt"] = int(time.time() * 1000) + tok.get("expires_in", 3600) * 1000
    creds["claudeAiOauth"] = oauth
    keychain_write(creds)
    print("• token rinfrescato e Keychain aggiornato", file=sys.stderr)
    return creds


def valid_token() -> str:
    creds = keychain_read()
    oauth = creds["claudeAiOauth"]
    # margine 60s
    if time.time() * 1000 >= oauth["expiresAt"] - 60_000:
        creds = refresh(creds)
        oauth = creds["claudeAiOauth"]
    return oauth["accessToken"]


def api_get(path: str, token: str, params: dict | None = None) -> dict:
    url = API_BASE + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={
        "authorization": f"Bearer {token}",
        "anthropic-beta": BETA,
        "anthropic-version": "2023-06-01",
        "User-Agent": USER_AGENT,
    })
    with urllib.request.urlopen(req) as r:
        return json.load(r)


def list_all() -> list[dict]:
    token = valid_token()
    items: list[dict] = []
    cursor = None
    seen_cursors = set()
    while True:
        params = {"limit": 100}
        if cursor:
            params["cursor"] = cursor
        data = api_get("/v1/code/triggers", token, params)
        batch = data.get("data", [])
        items.extend(batch)
        if not data.get("has_more"):
            break
        cursor = data.get("next_cursor")
        if not cursor or cursor in seen_cursors:
            # protezione anti-loop se il server ignora il cursore
            print("⚠ cursore non avanza — il server non onora `cursor`; stop.",
                  file=sys.stderr)
            break
        seen_cursors.add(cursor)
    return items


def main() -> None:
    args = sys.argv[1:]
    as_json = "--json" in args
    grep = None
    if "--grep" in args:
        grep = args[args.index("--grep") + 1].lower()

    items = list_all()
    if grep:
        items = [t for t in items if grep in t.get("name", "").lower()]

    if as_json:
        print(json.dumps(items, indent=2, ensure_ascii=False))
        return

    print(f"{len(items)} trigger\n")
    for t in sorted(items, key=lambda x: x.get("next_run_at") or ""):
        nxt = (t.get("next_run_at") or "—")[:10]
        print(f"{nxt}  {t.get('name','?')}")


if __name__ == "__main__":
    main()
