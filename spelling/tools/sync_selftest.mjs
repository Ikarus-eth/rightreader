// Self-test for the sync pipeline: post one encrypted file, exactly like the app does, as device "selftest".
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
const [topic, pubFile] = process.argv.slice(2);
const pubJwk = JSON.parse(readFileSync(pubFile, "utf8"));
const { subtle } = globalThis.crypto, enc = new TextEncoder();
const pub = await subtle.importKey("jwk", pubJwk, { name: "ECDH", namedCurve: "P-256" }, false, []);
const eph = await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
const key = await subtle.deriveKey({ name: "ECDH", public: pub }, eph.privateKey, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const savedAt = new Date().toISOString();
const data = gzipSync(enc.encode(JSON.stringify({ format: "spelling-progress-v1", device: "selftest", reason: "selftest", savedAt, root: { player: "juna", profiles: { juna: { learned: ["selftest"], hist: {} } } } })));
const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
const ct = Buffer.from(await subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode("spelling-progress-v1") }, key, data));
const e = await subtle.exportKey("jwk", eph.publicKey);
const body = JSON.stringify({ format: "spelling-progress-v1", alg: "ECDH-P256 AES-256-GCM", gzip: true, device: "selftest", savedAt, epk: { kty: e.kty, crv: e.crv, x: e.x, y: e.y }, iv: Buffer.from(iv).toString("base64"), ct: ct.toString("base64") });
const r = await fetch(`https://ntfy.sh/${topic}?filename=selftest.json&title=selftest`, { method: "POST", headers: { "Content-Type": "text/plain" }, body });
console.log("posted selftest", r.status);
