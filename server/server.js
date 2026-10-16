"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 8787;
const HOST = process.env.HOST || "127.0.0.1";
const DATA_FILE = process.env.GUESTBOOK_DATA_FILE || path.join(__dirname, "data", "guestbook.json");
const WORDLIST_FILE = path.join(__dirname, "wordlist.json");

const NAME_MAX = 40;
const MESSAGE_MAX = 200;
const MAX_BODY_BYTES = 10000;
const MAX_COMBINING_RUN = 3;     // stacked combining marks allowed per base char ("zalgo" guard)

const MAX_ENTRIES = 500;         // hard cap. new posts are rejected (503), old ones are never evicted
const GET_LIMIT = 100;           // GET returns at most the newest N

// rate limits. this process must be the only instance (limits and the write
// lock are in-process), and only Caddy on localhost can reach it.
const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_MAX_POSTS = 3;          // accepted posts per IP per window
const IP_MAX_ATTEMPTS = 15;      // any POST attempt per IP per window (caps filter probing)
const GLOBAL_WINDOW_MS = 60 * 60 * 1000;
const GLOBAL_MAX_POSTS = 30;     // accepted posts per hour, all IPs combined
const RATE_MAP_MAX = 10000;      // memory bound on tracked IPs

const MIN_TOKEN_LENGTH = 32;

function logError(context, err) {
  console.error("[guestbook] " + new Date().toISOString() + " " + context + ": " + (err && err.stack ? err.stack : err));
}

// --- admin token ---------------------------------------------------------
// a short token is treated as unset: delete stays disabled rather than
// guessable. compare sha256 digests so timingSafeEqual always sees equal
// lengths and the token length doesn't leak.
const ADMIN_TOKEN = (function () {
  var t = process.env.GUESTBOOK_ADMIN_TOKEN || "";
  if (t && t.length < MIN_TOKEN_LENGTH) {
    console.error("error: GUESTBOOK_ADMIN_TOKEN is shorter than " + MIN_TOKEN_LENGTH +
      " characters; ignoring it. admin delete is disabled until it's replaced (openssl rand -hex 24).");
    return "";
  }
  return t;
})();
const ADMIN_TOKEN_DIGEST = ADMIN_TOKEN ? crypto.createHash("sha256").update(ADMIN_TOKEN, "utf8").digest() : null;

function tokenMatches(candidate) {
  if (!ADMIN_TOKEN_DIGEST || typeof candidate !== "string" || !candidate) return false;
  try {
    var digest = crypto.createHash("sha256").update(candidate, "utf8").digest();
    return crypto.timingSafeEqual(digest, ADMIN_TOKEN_DIGEST);
  } catch (e) {
    return false;
  }
}

function bearerToken(req) {
  var h = req.headers["authorization"];
  if (typeof h !== "string") return "";
  var m = h.match(/^Bearer\s+(\S+)\s*$/i);
  return m ? m[1] : "";
}

// --- profanity filter ----------------------------------------------------
// Two engines, both run on every post; either one flagging rejects it.
//   1. bad-words (optional dependency) - whole-word matching on a big list
//   2. bundled wordlist.json - substring matching per token, plus a pass over
//      runs of 1-2 letter tokens joined together ("f u c k", "f.u.c.k", "fu ck")
// Input is normalized first: NFKC, format chars stripped, diacritics removed,
// common Cyrillic/Greek lookalikes mapped to Latin, leetspeak substituted.
let filter = null;
try {
  const Filter = require("bad-words");
  filter = new Filter();
} catch (e) {
  filter = null;
}

let substringWords = [];
let tokenWords = [];
let allowWords = [];
try {
  var wl = JSON.parse(fs.readFileSync(WORDLIST_FILE, "utf8"));
  if (Array.isArray(wl)) {
    substringWords = wl;                       // legacy format: plain array
  } else {
    substringWords = wl.substring || [];
    tokenWords = wl.token || [];
    allowWords = wl.allow || [];
  }
} catch (e) {
  logError("couldn't load wordlist.json, bundled filter is empty", e);
}

const LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i", "|": "l" };

// Cyrillic / Greek letters that render like Latin ones
const CONFUSABLES = {
  "а": "a", "в": "b", "е": "e", "ё": "e", "к": "k", "м": "m", "н": "h", "о": "o", "р": "p",
  "с": "c", "т": "t", "у": "y", "х": "x", "і": "i", "ї": "i", "ј": "j", "ѕ": "s", "ԁ": "d",
  "ɡ": "g", "ԛ": "q", "ԝ": "w", "ь": "b", "п": "n", "г": "r", "и": "u", "ц": "u",
  "α": "a", "β": "b", "ε": "e", "η": "n", "ι": "i", "κ": "k", "ν": "v", "ο": "o", "ρ": "p",
  "τ": "t", "υ": "u", "χ": "x", "γ": "y", "ϲ": "c", "ѵ": "v"
};

function foldForFilter(str) {
  return String(str)
    .normalize("NFKC")
    .replace(/\p{Cf}/gu, "")                    // zero-width, bidi controls, soft hyphen...
    .toLowerCase()
    .normalize("NFD").replace(/\p{M}/gu, "")    // fück -> fuck
    .replace(/./gu, function (ch) { return CONFUSABLES[ch] || ch; })
    .replace(/[013457@$!|]/g, function (ch) { return LEET[ch] || ch; })
    .replace(/(\p{L})\1{2,}/gu, "$1$1");        // fuuuuck -> fuuck (regexes below allow repeats)
}

// punctuation -> space, whitespace collapsed. used for the bad-words engine.
function lightNormalize(str) {
  return foldForFilter(str).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

// "fuck" -> /f{1,}u{1,}c{1,}k{1,}/ so stretched letters still match, while
// "boob" -> /b{1,}o{2,}b{1,}/ so it doesn't match "bob".
function repeatTolerant(word) {
  var runs = word.match(/(.)\1*/g) || [];
  return runs.map(function (r) { return escapeRegex(r[0]) + "{" + r.length + ",}"; }).join("");
}

const substringRegexes = substringWords.map(function (w) { return new RegExp(repeatTolerant(w)); });
const tokenRegexes = tokenWords.map(function (w) { return new RegExp("^" + repeatTolerant(w) + "s*$"); });
const allowRegexes = allowWords.map(function (w) { return new RegExp(repeatTolerant(w), "g"); });

function bundledFlags(str) {
  var tokens = lightNormalize(str).split(" ").filter(Boolean);
  var candidates = [];
  var shortRun = "";
  tokens.forEach(function (t) {
    if (t.length <= 2) {
      shortRun += t;
    } else {
      if (shortRun.length > 2) candidates.push(shortRun);
      shortRun = "";
    }
    candidates.push(t);
  });
  if (shortRun.length > 2) candidates.push(shortRun);

  return candidates.some(function (tok) {
    if (tokenRegexes.some(function (re) { return re.test(tok); })) return true;
    // allowlisted words (scrap, cockpit, dickens...) are cut out before the substring check
    var cleaned = tok;
    allowRegexes.forEach(function (re) { cleaned = cleaned.replace(re, " "); });
    return cleaned.split(" ").some(function (part) {
      return part && substringRegexes.some(function (re) { return re.test(part); });
    });
  });
}

function isProfane(str) {
  if (bundledFlags(str)) return true;
  if (filter) {
    try {
      if (filter.isProfane(lightNormalize(str))) return true;
    } catch (e) {
      logError("bad-words engine threw", e);
    }
  }
  return false;
}

// --- input cleanup -------------------------------------------------------
// strip control and format characters (bidi overrides, zero-width joiners,
// etc. - display spoofing) and cap stacked combining marks, before length checks.
const COMBINING_RUN = new RegExp("(\\p{M}{" + MAX_COMBINING_RUN + "})\\p{M}+", "gu");
function cleanText(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/[\t\n\r]+/g, " ")
    .replace(/\p{Cc}/gu, "")
    .replace(/\p{Cf}/gu, "")
    .replace(COMBINING_RUN, "$1")
    .replace(/ {2,}/g, " ")
    .trim();
}

// --- rate limiting -------------------------------------------------------
// Caddy (the only thing that can reach this) sets X-Forwarded-For; the last
// value is the address Caddy itself saw. see README for the Cloudflare note.
function clientIp(req) {
  var xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    var parts = xff.split(",");
    var last = parts[parts.length - 1].trim();
    if (last) return last;
  }
  return (req.socket && req.socket.remoteAddress) || "unknown";
}

const ipAttempts = new Map(); // ip -> [ts, ...]
const ipPosts = new Map();    // ip -> [ts, ...]
let globalPosts = [];         // [ts, ...]

function recent(list, windowMs, now) {
  return list.filter(function (t) { return now - t < windowMs; });
}

function bump(map, ip, windowMs, now) {
  var list = recent(map.get(ip) || [], windowMs, now);
  list.push(now);
  map.delete(ip);              // re-insert so Map order tracks recency
  map.set(ip, list);
  while (map.size > RATE_MAP_MAX) {
    map.delete(map.keys().next().value);
  }
  return list.length;
}

function countIn(map, ip, windowMs, now) {
  var list = map.get(ip);
  return list ? recent(list, windowMs, now).length : 0;
}

function pruneRateMaps() {
  var now = Date.now();
  [ipAttempts, ipPosts].forEach(function (map) {
    map.forEach(function (list, ip) {
      var kept = recent(list, IP_WINDOW_MS, now);
      if (kept.length) map.set(ip, kept); else map.delete(ip);
    });
  });
  globalPosts = recent(globalPosts, GLOBAL_WINDOW_MS, now);
}
setInterval(pruneRateMaps, 5 * 60 * 1000).unref();

// --- storage ---------------------------------------------------------------
// serialize reads-then-writes so concurrent requests can't clobber the file
let writeChain = Promise.resolve();
function withWriteLock(fn) {
  var run = writeChain.then(fn);
  writeChain = run.catch(function () {});
  return run;
}

// a missing file is an empty guestbook. anything else (unreadable, truncated,
// not JSON, not an array) throws, so a write never replaces data it couldn't read.
function readEntries() {
  var raw;
  try {
    raw = fs.readFileSync(DATA_FILE, "utf8");
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
  var parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("guestbook data is not an array");
  return parsed;
}

// write tmp -> fsync -> rename, so a crash mid-write leaves the old file intact
function writeEntries(entries) {
  var dir = path.dirname(DATA_FILE);
  fs.mkdirSync(dir, { recursive: true });
  var tmp = DATA_FILE + ".tmp-" + process.pid;
  var fd = fs.openSync(tmp, "w", 0o600);
  try {
    fs.writeFileSync(fd, JSON.stringify(entries, null, 2));
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, DATA_FILE);
  try {
    var dfd = fs.openSync(dir, "r");
    try { fs.fsyncSync(dfd); } finally { fs.closeSync(dfd); }
  } catch (e) {
    // directory fsync is best-effort; not supported everywhere
  }
}

function StorageFullError() { this.name = "StorageFullError"; }

// --- http ------------------------------------------------------------------
function send(res, status, body, extraHeaders) {
  var json = JSON.stringify(body);
  var headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(json),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };
  if (extraHeaders) {
    Object.keys(extraHeaders).forEach(function (k) { headers[k] = extraHeaders[k]; });
  }
  res.writeHead(status, headers);
  res.end(json);
}

function readBody(req, cb) {
  var chunks = [];
  var size = 0;
  var done = false;
  req.on("data", function (chunk) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      if (!done) { done = true; cb(new Error("payload too large")); }
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on("end", function () {
    if (done) return;
    done = true;
    try {
      var raw = Buffer.concat(chunks).toString("utf8");
      cb(null, raw ? JSON.parse(raw) : {});
    } catch (e) {
      cb(e);
    }
  });
  req.on("error", function (e) {
    if (!done) { done = true; cb(e); }
  });
}

function handlePost(req, res) {
  var ip = clientIp(req);
  var now = Date.now();

  if (bump(ipAttempts, ip, IP_WINDOW_MS, now) > IP_MAX_ATTEMPTS) {
    return send(res, 429, { error: "rate_limited", message: "slow down. the guestbook isn't going anywhere." },
      { "Retry-After": String(Math.ceil(IP_WINDOW_MS / 1000)) });
  }

  readBody(req, function (err, body) {
    if (err) {
      return send(res, 400, { error: "bad_request", message: "that didn't parse. try again." });
    }
    if (!body || typeof body !== "object") body = {};

    var name = cleanText(body.name);
    var message = cleanText(body.message);

    if (!name || !message) {
      return send(res, 400, { error: "missing_fields", message: "name and message are both required." });
    }
    if (name.length > NAME_MAX) {
      return send(res, 400, { error: "name_too_long", message: "name's gotta be " + NAME_MAX + " characters or under." });
    }
    if (message.length > MESSAGE_MAX) {
      return send(res, 400, { error: "message_too_long", message: "message's gotta be " + MESSAGE_MAX + " characters or under." });
    }
    if (isProfane(name) || isProfane(message)) {
      return send(res, 422, { error: "flagged", message: "that didn't pass the language filter - mind cleaning it up and resubmitting?" });
    }

    // check-and-record happens synchronously here, so concurrent requests
    // can't all slip past the limit before any of them is counted.
    var t = Date.now();
    if (countIn(ipPosts, ip, IP_WINDOW_MS, t) >= IP_MAX_POSTS) {
      return send(res, 429, { error: "rate_limited", message: "you've signed enough for now. try again in a few minutes." },
        { "Retry-After": String(Math.ceil(IP_WINDOW_MS / 1000)) });
    }
    globalPosts = recent(globalPosts, GLOBAL_WINDOW_MS, t);
    if (globalPosts.length >= GLOBAL_MAX_POSTS) {
      return send(res, 429, { error: "rate_limited", message: "the guestbook's had a busy hour. try again later." },
        { "Retry-After": "600" });
    }
    bump(ipPosts, ip, IP_WINDOW_MS, t);
    globalPosts.push(t);

    var entry = {
      key: "guestbook:" + crypto.randomUUID(),
      name: name,
      message: message,
      ts: t
    };

    withWriteLock(function () {
      var all = readEntries();
      if (all.length >= MAX_ENTRIES) throw new StorageFullError();
      all.push(entry);
      writeEntries(all);
    }).then(function () {
      send(res, 201, entry);
    }).catch(function (e) {
      if (e instanceof StorageFullError) {
        return send(res, 503, { error: "full", message: "the guestbook is full for now. check back later." });
      }
      logError("POST write failed", e);
      send(res, 500, { error: "storage_failed", message: "couldn't save that. try again in a bit." });
    });
  });
}

function handleDelete(req, res, rawKey) {
  // auth first. nothing about the request is parsed before the token checks out.
  if (!tokenMatches(bearerToken(req))) {
    return send(res, 401, { error: "unauthorized", message: "invalid admin token." });
  }

  var key;
  try {
    key = decodeURIComponent(rawKey);
  } catch (e) {
    return send(res, 400, { error: "bad_request", message: "malformed key." });
  }

  withWriteLock(function () {
    var all = readEntries();
    var next = all.filter(function (e) { return e.key !== key; });
    if (next.length === all.length) return false;
    writeEntries(next);
    return true;
  }).then(function (found) {
    if (!found) return send(res, 404, { error: "not_found", message: "no entry with that key." });
    send(res, 200, { deleted: key });
  }).catch(function (e) {
    logError("DELETE write failed", e);
    send(res, 500, { error: "storage_failed", message: "couldn't delete that. try again in a bit." });
  });
}

const server = http.createServer(function (req, res) {
  var url;
  try {
    url = new URL(req.url, "http://localhost");
  } catch (e) {
    return send(res, 400, { error: "bad_request", message: "malformed request." });
  }
  var pathname = url.pathname;

  try {
    if (pathname === "/api/guestbook" && req.method === "GET") {
      var entries;
      try {
        entries = readEntries();
      } catch (e) {
        logError("GET read failed", e);
        return send(res, 500, { error: "storage_failed", message: "couldn't read the guestbook right now." });
      }
      entries = entries.slice().sort(function (a, b) { return b.ts - a.ts; }).slice(0, GET_LIMIT);
      return send(res, 200, entries);
    }

    if (pathname === "/api/guestbook" && req.method === "POST") {
      return handlePost(req, res);
    }

    var delMatch = pathname.match(/^\/api\/guestbook\/(.+)$/);
    if (delMatch && req.method === "DELETE") {
      return handleDelete(req, res, delMatch[1]);
    }

    send(res, 404, { error: "not_found" });
  } catch (e) {
    logError("unhandled request error", e);
    send(res, 500, { error: "server_error", message: "something broke server-side." });
  }
});

server.listen(PORT, HOST, function () {
  console.log("guestbook api listening on " + HOST + ":" + PORT +
    (filter ? " (bad-words + bundled wordlist)" : " (bundled wordlist only)"));
  if (!ADMIN_TOKEN) {
    console.warn("warning: no usable GUESTBOOK_ADMIN_TOKEN - admin delete will always return 401.");
  }
});
