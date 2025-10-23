# Collectible Scanning & Ownership Sync plan (v0.1)

## Goals
- Link every physical collectible (QR / NFC) to a digital twin tracked in Redis.
- Enable instant claim by scanning; prevent reuse, cloning, or fraudulent scans.
- Surface scan state in the app (claimed/unclaimed, last seen, owner profile).
- Capture analytics (time, location hints, device) for anti-fraud and community ops.

## Data Model Additions (Redis Structures)
| Table | Purpose | Key fields |
| --- | --- | --- |
| `PhysicalUnit` *(existing)* | Represents each collectible. Extend with `qrPayload`, `nfcUid`, `status`, `lastScanAt`, `scanCount`. |
| `ScanEvent` | Audit each scan regardless of success. Fields: `id`, `physicalUnitId`, `deviceFingerprint`, `scannedAt`, `result` (`success`, `duplicate`, `blocked`, `unknown_unit`), `geoHint`, `ip`, `clientVersion`. |
| `ScanSession` | Optional ephemeral state for multi-step flows. Fields: `id`, `physicalUnitId`, `nonce`, `expiresAt`, `createdByUserId` (nullable). Used for verifying code+HMAC flow. |
| `Device` (optional) | Persist device fingerprint & trust score for abuse heuristics. |

### Indexing & Constraints
- `PhysicalUnit`: index on `qrPayload`/`nfcUid`; unique enforcement.
- `ScanEvent`: composite index `(physicalUnitId, scannedAt DESC)` to query recent activity.
- TTL/cleanup job to drop stale `ScanSession` entries.

## API Flow (Next.js API routes → Server Actions later)
1. **`POST /api/scan/start`**
   - Payload: `{ payload: string, channel: 'qr'|'nfc', deviceFingerprint }`.
   - Lookup `PhysicalUnit` by hashed payload (use `hashCode`).
   - Rate limit per device + IP.
   - Respond: `{ status: 'ready', unitId, challengeNonce, expiresIn }` or `{ status: 'already-claimed', owner }`.
   - Log `ScanEvent` with `result`.
2. **`POST /api/scan/complete`**
   - Authenticated user (dev cookie for now, real auth later).
   - Payload: `{ unitId, nonce, signature }` (HMAC with secureSalt per existing claim flow).
   - Atomically mark `PhysicalUnit.status = 'claimed'`, set `claimedBy`, create `Ownership`.
   - Update `lastScanAt`, increment `scanCount`.
   - Log `ScanEvent` with `result: 'success'`.
3. **`GET /api/scan/:unitId`**
   - Return status & metadata for client preview.

### NFC support
- Optional handshake to validate NDEF signature or manufacturer UID.
- Store `nfcUid` and cross-check on subsequent scans.

## Client UX
1. Camera scanner view (existing `QrScanner.tsx` foundation) handles both QR and manual entry fallback.
2. On scan success → show inline unit card, confirm claim, explain rewards.
3. On duplicates/blocked → show help CTA + contact support link.
4. Streaming updates while scanning: show `scanCount` to reassure uniqueness.

## Anti-Fraud & Telemetry
- Rate limit by IP, device fingerprint, and `PhysicalUnit` to prevent brute force.
- Geo/IP heuristics: compare to previous scans; mark anomalies in `AbuseEvent`.
- Expose admin dashboard showing daily scans, duplicates prevented, heatmap.

## Background Jobs
- Cron (worker) to expire stale sessions, rotate secure salts if needed.
- Nightly job to sync new `PhysicalUnit` seed data from CSV → Redis.

## Seed & Tooling
- Extend the Redis seeding script to ingest CSV of collectibles with columns: `code`, `characterId`, `secureSalt`, `batch`, `series`.
- CLI: `npm run import:cxp -- --file ./data/collectibles.csv --set "Wave"` to upsert claimable codes.
- Provide `scripts/export-scans.ts` to dump `ScanEvent` for ops.

## Security Checklist
- All payload comparisons use constant-time HMAC (reuse `computeChallengeDigest`).
- Never log plaintext codes; only hashed values.
- Sign QR payloads at manufacturing time: `QR = base64(code:nonce)` with checksum.
- Enforce HTTPS + certificate pinning on mobile app build.
- Consider FIDO/WebAuthn for high-value claim confirmation in future.

## Next Steps
1. Define Redis data structures (`PhysicalUnit`, new tables) and enforce consistency helpers.
2. Implement `scan/start` + `scan/complete` APIs with tests.
3. Refresh `QrScanner` UI to support NFC tag reading (Web NFC where supported) and manual fallback.
4. Build admin dashboard for monitoring (scan volume, duplicates, flagged devices).
5. Integrate push notifications / email after successful claim.
