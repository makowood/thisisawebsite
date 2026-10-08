"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 8787;
const HOST = process.env.HOST || "127.0.0.1";
const ADMIN_TOKEN = process.env.GUESTBOOK_ADMIN_TOKEN || "";
const DATA_FILE = path.join(__dirname, "data", "guestbook.json");
const WORDLIST_FILE = path.join(__dirname, "wordlist.json");

const NAME_MAX = 40;
const MESSAGE_MAX = 200;
const MAX_BODY_BYTES = 10000;

// Prefer the bad-words package when it's installed; fall back to the
// bundled wordlist otherwise. Either way, input is normalized first so
// basic leetspeak/spacing evasion still gets caught.
let filter = null;
try {
  const Filter = require("bad-words");
  filter = new Filter();
} catch (e) {
  filter = null;
}

let bundledWords = [];
try {
  bundledWords = JSON.parse(fs.readFileSync(WORDLIST_FILE, "utf8"));
} catch (e) {
  bundledWords = [];
}

const LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" };

function leetSub(str) {
  return str.replace(/[013457@$]/g, function (ch) { return LEET[ch] || ch; });
}

// lowercase + leetspeak substitution, punctuation -> space, whitespace collapsed
function lightNormalize(str) {
  return leetSub(String(str).toLowerCase())
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// same, but with whitespace stripped entirely - catches "b a d w o r d" style evasion
function strictNormalize(str) {
  return lightNormalize(str).replace(/\s+/g, "");
}

function isProfane(str) {
  if (filter) {
    try {
      return filter.isProfane(lightNormalize(str));
    } catch (e) {
      // fall through to bundled wordlist
    }
  }
  var stripped = strictNormalize(str);
  return bundledWords.some(function (w) { return stripped.indexOf(w) !== -1; });
}

// serialize reads-then-writes so concurrent requests can't clobber the file
let writeChain = Promise.resolve();
function withWriteLock(fn) {
  writeChain = writeChain.then(fn, fn);
  return writeChain;
}

function readEntries() {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    if (!fs.existsSync(DATA_FILE)) return [];
    var raw = fs.readFileSync(DATA_FILE, "utf8");
    return raw.trim() ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function writeEntries(entries) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2));
}

function safeEqual(a, b) {
  try {
    var bufA = Buffer.from(String(a));
    var bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (e) {
    return false;
  }
}

function send(res, status, body) {
  var json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(json)
  });
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

const server = http.createServer(function (req, res) {
  var url;
  try {
    url = new URL(req.url, "http://" + req.headers.host);
  } catch (e) {
    return send(res, 400, { error: "bad_request", message: "malformed request." });
  }
  var pathname = url.pathname;

  try {
    if (pathname === "/api/guestbook" && req.method === "GET") {
      var entries = readEntries().slice().sort(function (a, b) { return b.ts - a.ts; });
      return send(res, 200, entries);
    }

    if (pathname === "/api/guestbook" && req.method === "POST") {
      return readBody(req, function (err, body) {
        if (err) {
          return send(res, 400, { error: "bad_request", message: "that didn't parse. try again." });
        }

        var name = String((body && body.name) || "").trim();
        var message = String((body && body.message) || "").trim();

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

        var entry = {
          key: "guestbook:" + Date.now(),
          name: name,
          message: message,
          ts: Date.now()
        };

        withWriteLock(function () {
          var all = readEntries();
          all.push(entry);
          writeEntries(all);
        }).then(function () {
          send(res, 201, entry);
        }).catch(function () {
          send(res, 500, { error: "storage_failed", message: "couldn't save that. try again in a bit." });
        });
      });
    }

    var delMatch = pathname.match(/^\/api\/guestbook\/(.+)$/);
    if (delMatch && req.method === "DELETE") {
      var key = decodeURIComponent(delMatch[1]);
      var token = req.headers["x-admin-token"] || "";

      if (!ADMIN_TOKEN || !safeEqual(token, ADMIN_TOKEN)) {
        return send(res, 401, { error: "unauthorized", message: "invalid admin token." });
      }

      withWriteLock(function () {
        var all = readEntries();
        var next = all.filter(function (e) { return e.key !== key; });
        var found = next.length !== all.length;
        writeEntries(next);
        return found;
      }).then(function (found) {
        if (!found) return send(res, 404, { error: "not_found", message: "no entry with that key." });
        send(res, 200, { deleted: key });
      }).catch(function () {
        send(res, 500, { error: "storage_failed", message: "couldn't delete that. try again in a bit." });
      });
      return;
    }

    send(res, 404, { error: "not_found" });
  } catch (e) {
    send(res, 500, { error: "server_error", message: "something broke server-side." });
  }
});

server.listen(PORT, HOST, function () {
  console.log("guestbook api listening on " + HOST + ":" + PORT + (filter ? " (bad-words engine)" : " (bundled wordlist)"));
  if (!ADMIN_TOKEN) {
    console.warn("warning: GUESTBOOK_ADMIN_TOKEN is not set — admin delete will always return 401.");
  }
});
