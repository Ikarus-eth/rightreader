#!/usr/bin/env node
// Decrypt a spelling progress file from the progress-data branch.
//   node read_progress.mjs <file.enc.json> < key.jwk              -> decrypted progress (JSON)
//   node read_progress.mjs <file.enc.json> --export juna < key.jwk -> file for the app's "Restore from a saved file"
// The private key (JWK) is read from stdin so it never appears in arguments, history or logs.
// Don't save decrypted output inside the repository checkout.
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
const [file, flag, who] = process.argv.slice(2);
const env = JSON.parse(readFileSync(file, "utf8"));
const jwk = JSON.parse(readFileSync(0, "utf8"));
const { subtle } = globalThis.crypto;
const priv = await subtle.importKey("jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveKey"]);
const epk = await subtle.importKey("jwk", env.epk, { name: "ECDH", namedCurve: "P-256" }, false, []);
const key = await subtle.deriveKey({ name: "ECDH", public: epk }, priv, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
const plain = Buffer.from(await subtle.decrypt({ name: "AES-GCM", iv: Buffer.from(env.iv, "base64"), additionalData: new TextEncoder().encode(env.format) }, key, Buffer.from(env.ct, "base64")));
const data = JSON.parse((env.gzip ? gunzipSync(plain) : plain).toString("utf8"));
if (flag !== "--export") { console.log(JSON.stringify(data, null, 1)); process.exit(0); }
const p = data.root.profiles[who];
if (!p) { console.error("No profile", who, "in", Object.keys(data.root.profiles)); process.exit(1); }
const pad = n => String(n).padStart(2, "0");
const ymd = t => { const d = new Date(t); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
const res = r => r === 1 ? "right" : r === 2 ? "skipped" : "wrong";
const out = { app: "spelling practice", child: who[0].toUpperCase() + who.slice(1), exported: data.savedAt, currentLevel: p.level,
  activeMinutesPerDay: Object.fromEntries(Object.entries(p.time || {}).map(([d, s]) => [d, Math.round(s / 6) / 10])),
  words: Object.fromEntries(Object.entries(p.hist || {}).map(([w, h]) => [w, { tries: h.map(([t, r]) => ({ date: t ? ymd(t) : null, result: res(r) })) }])),
  rounds: (p.rounds || []).map(r => { const d = new Date(r.t); return { date: ymd(r.t) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()), type: r.mode, right: r.right, of: r.n, levels: r.levels }; }) };
console.log(JSON.stringify(out, null, 1));
