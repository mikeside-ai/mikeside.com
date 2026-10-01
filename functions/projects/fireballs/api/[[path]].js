// Fireballs parent API — /projects/fireballs/api/*
//
// Serves the private half of /projects/fireballs/: roster, snack rotation,
// RSVPs and the team chat link. None of that lives in this public repo; it
// lives in the D1 database bound as DB.
//
// FAILS CLOSED. Every request must carry a valid Cloudflare Access JWT for
// the Access application configured by these Pages environment variables:
//   ACCESS_TEAM_DOMAIN  e.g. "mikeside.cloudflareaccess.com"
//   ACCESS_AUD          the application's Audience (AUD) tag
// If either variable or the DB binding is missing, the API returns 503 and
// serves nothing. A spoofed Cf-Access-Authenticated-User-Email header is
// ignored: only a signature-verified JWT counts.
//
// SELF SIGN-UP. The Access policy lets any parent log in with an emailed
// one-time code. That proves the email, not team membership, so a signed-in
// email must also be in the D1 `members` table. New parents join by entering
// the team code (D1 settings.team_code, shared in the team GroupMe). Join
// attempts are limited per email. Remove someone with DELETE FROM members.

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex",
    },
  });

const b64urlToBytes = (s) => {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
};
const b64urlToJson = (s) => JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));

let certCache = { at: 0, keys: [] };

async function accessKeys(teamDomain) {
  if (Date.now() - certCache.at < 10 * 60 * 1000 && certCache.keys.length) return certCache.keys;
  const r = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!r.ok) throw new Error("certs fetch failed");
  const { keys } = await r.json();
  certCache = { at: Date.now(), keys: keys || [] };
  return certCache.keys;
}

function readCookie(request, name) {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === name) return part.slice(i + 1);
  }
  return null;
}

// Returns the signed-in email, or null.
async function verifyAccess(request, env) {
  const token =
    request.headers.get("cf-access-jwt-assertion") || readCookie(request, "CF_Authorization");
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = b64urlToJson(parts[0]);
    const payload = b64urlToJson(parts[1]);
    if (header.alg !== "RS256") return null;
    const keys = await accessKeys(env.ACCESS_TEAM_DOMAIN);
    const jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey(
      "jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5", key, b64urlToBytes(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    if (!ok) return null;
    const now = Math.floor(Date.now() / 1000);
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.includes(env.ACCESS_AUD)) return null;
    if (payload.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) return null;
    if (!payload.exp || payload.exp < now) return null;
    if (payload.nbf && payload.nbf > now + 60) return null;
    return (payload.email || payload.common_name || "").toLowerCase() || null;
  } catch {
    return null;
  }
}

async function sha256hex(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
// Constant-time compare of two hex digests of equal length.
function sameHex(a, b) {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}
const normCode = (c) => String(c || "").trim().toLowerCase().replace(/\s+/g, "");
const MAX_JOIN_TRIES = 8; // per email per hour

const GAME_RE = /^\d{4}-\d{2}-\d{2}$/;
const RSVP = new Set(["yes", "no", "maybe"]);

export async function onRequest({ request, env, params }) {
  if (!env.DB || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
    return json({ error: "not_configured" }, 503);
  }
  const email = await verifyAccess(request, env);
  if (!email) return json({ error: "unauthorized" }, 401);

  const route = (params.path || []).join("/");
  const method = request.method;

  try {
    const member = await env.DB.prepare("SELECT email, name, phone FROM members WHERE email = ?").bind(email).first();

    if (route === "join" && method === "POST") {
      if (member) return json({ ok: true });
      const tries = await env.DB.prepare(
        "SELECT COUNT(*) AS n FROM join_attempts WHERE email = ? AND at > datetime('now','-1 hour')"
      ).bind(email).first();
      if ((tries && tries.n) >= MAX_JOIN_TRIES) return json({ error: "too_many_tries" }, 429);
      const b = await request.json().catch(() => ({}));
      const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'team_code'").first();
      const want = row && normCode(row.value);
      const got = normCode(b.code);
      const ok = !!want && !!got && sameHex(await sha256hex(got), await sha256hex(want));
      if (!ok) {
        await env.DB.prepare("INSERT INTO join_attempts (email, at) VALUES (?, datetime('now'))").bind(email).run();
        return json({ error: "wrong_code" }, 403);
      }
      const name = String(b.name || "").trim().slice(0, 80) || null;
      await env.DB.prepare(
        "INSERT OR IGNORE INTO members (email, name, joined_at) VALUES (?, ?, datetime('now'))"
      ).bind(email, name).run();
      return json({ ok: true });
    }

    if (!member) return json({ error: "not_member", me: email }, 403);

    if (route === "team" && method === "GET") {
      const [players, snacks, rsvps, settings, mine] = await env.DB.batch([
        env.DB.prepare("SELECT id, display FROM players WHERE active = 1 ORDER BY sort, id"),
        env.DB.prepare("SELECT game_date, player_id FROM snacks"),
        env.DB.prepare("SELECT game_date, player_id, status FROM rsvps"),
        env.DB.prepare("SELECT key, value FROM settings WHERE key IN ('groupme_url','coach_note')"),
        env.DB.prepare("SELECT player_id FROM member_players WHERE email = ?").bind(email),
      ]);
      const s = Object.fromEntries(settings.results.map((r) => [r.key, r.value]));
      return json({
        me: email,
        my_name: member.name || null,
        my_phone: member.phone || null,
        my_players: mine.results.map((r) => r.player_id),
        players: players.results,
        snacks: snacks.results,
        rsvps: rsvps.results,
        groupme_url: s.groupme_url || null,
        coach_note: s.coach_note || null,
      });
    }

    if (route === "me" && method === "POST") {
      const b = await request.json().catch(() => ({}));
      const name = String(b.name || "").trim().slice(0, 80) || null;
      const phone = String(b.phone || "").replace(/[^0-9+()\-. ]/g, "").trim().slice(0, 24) || null;
      const ids = Array.isArray(b.player_ids) ? [...new Set(b.player_ids.map(Number))].filter(Number.isInteger).slice(0, 8) : [];
      const valid = ids.length
        ? (await env.DB.prepare(`SELECT id FROM players WHERE active = 1 AND id IN (${ids.map(() => "?").join(",")})`).bind(...ids).all()).results.map((r) => r.id)
        : [];
      await env.DB.batch([
        env.DB.prepare("UPDATE members SET name = ?, phone = ? WHERE email = ?").bind(name, phone, email),
        env.DB.prepare("DELETE FROM member_players WHERE email = ?").bind(email),
        ...valid.map((id) => env.DB.prepare("INSERT INTO member_players (email, player_id) VALUES (?, ?)").bind(email, id)),
      ]);
      return json({ ok: true, name, phone, player_ids: valid });
    }

    if (route === "rsvp" && method === "POST") {
      const b = await request.json().catch(() => ({}));
      const pid = Number(b.player_id);
      if (!GAME_RE.test(b.game_date || "") || !Number.isInteger(pid)) return json({ error: "bad_request" }, 400);
      if (b.status === null || b.status === "") {
        await env.DB.prepare("DELETE FROM rsvps WHERE game_date = ? AND player_id = ?").bind(b.game_date, pid).run();
        return json({ ok: true });
      }
      if (!RSVP.has(b.status)) return json({ error: "bad_request" }, 400);
      const p = await env.DB.prepare("SELECT 1 FROM players WHERE id = ? AND active = 1").bind(pid).first();
      if (!p) return json({ error: "unknown_player" }, 404);
      await env.DB.prepare(
        `INSERT INTO rsvps (game_date, player_id, status, updated_by, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT (game_date, player_id) DO UPDATE SET
           status = excluded.status, updated_by = excluded.updated_by, updated_at = excluded.updated_at`
      ).bind(b.game_date, pid, b.status, email).run();
      return json({ ok: true });
    }

    if (route === "snack" && method === "POST") {
      const b = await request.json().catch(() => ({}));
      if (GAME_RE.test(b.game_date || "") && (b.player_id === null || b.player_id === "")) {
        await env.DB.prepare("DELETE FROM snacks WHERE game_date = ?").bind(b.game_date).run();
        return json({ ok: true });
      }
      const pid = Number(b.player_id);
      if (!GAME_RE.test(b.game_date || "") || !Number.isInteger(pid)) return json({ error: "bad_request" }, 400);
      const p = await env.DB.prepare("SELECT 1 FROM players WHERE id = ? AND active = 1").bind(pid).first();
      if (!p) return json({ error: "unknown_player" }, 404);
      await env.DB.prepare(
        `INSERT INTO snacks (game_date, player_id, updated_by, updated_at)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT (game_date) DO UPDATE SET
           player_id = excluded.player_id, updated_by = excluded.updated_by, updated_at = excluded.updated_at`
      ).bind(b.game_date, pid, email).run();
      return json({ ok: true });
    }

    return json({ error: "not_found" }, 404);
  } catch (e) {
    return json({ error: "server_error" }, 500);
  }
}
