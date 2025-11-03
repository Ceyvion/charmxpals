# Beta Wave 1 – Access + Claim Codes

## Testers

| Email | Access Notes | Claim Code | Series |
| --- | --- | --- | --- |
| johnhashats@gmail.com | 1st-wave tester | `CXP-429D-BLUE-WTR-ICE-5TVET` | Blue Dash |
| tylynstewart@gmail.com | 1st-wave tester | `CXP-271P-PURPLE-MYS-DRM-1F103` | Purple Dash |
| tatiabiggs@yahoo.com | 1st-wave tester | `CXP-258D-BLACK-SHD-NGT-14HQ8` | Black Dash |
| noelcle@gmail.com | Paired with FlowerBaby | `CXP-492P-PINK-LUV-ROS-UC2PT` | Pink Dash |
| 1227flowerbaby@gmail.com | Shares code with Noel (confirm if unique needed) | `CXP-492P-PINK-LUV-ROS-UC2PT` | Pink Dash |
| demetriam000@gmail.com | 1st-wave tester | `CXP-132D-PINK-LUV-ROS-GMRER` | Pink Dash |

> ⚠️ `noelcle@gmail.com` and `1227flowerbaby@gmail.com` were both given the same claim code. If you want one-per-person ownership, allocate an additional unique code before import.

## Setup Checklist

1. **Whitelist the testers in NextAuth**
   - Set `BETA_TESTERS` in Vercel (Preview + Production) to:  
     ```
     johnhashats@gmail.com,tylynstewart@gmail.com,tatiabiggs@yahoo.com,noelcle@gmail.com,1227flowerbaby@gmail.com,demetriam000@gmail.com
     ```
   - Keep `BETA_ACCESS_SECRET` and `NEXTAUTH_SECRET` aligned with the prod/staging values you generated earlier.

2. **Seed the claim codes in Upstash**
   - Pull the latest `main`.
   - Run the importer against the curated CSV:  
     ```bash
     npm run import:cxp -- --file data/beta_wave1_codes.csv --set "Beta Wave 1"
     ```
   - The script automatically hashes the codes, ties them to the matching character series, and records them under the `"Beta Wave 1"` set (re-using it if it already exists).

3. **Verify**
   - Confirm each code was stored (optional quick check):
     ```bash
     npm run import:cxp -- --file data/beta_wave1_codes.csv --set "Beta Wave 1" --dry-run
     ```
     *(No dry-run flag exists today; instead, re-running the command will report codes as “skipped” if they already live in Redis.)*
   - After sign-in, testers land on `/me` where the “Beta Test Checklist” widget tracks their local progress. Ask them to work through every item before sending feedback.
   - Visit the deployed `/login`, sign in with a tester email + the beta access code, then redeem the assigned claim code at `/claim` to ensure ownership flows through to `/me`.

4. **Communicate**
   - Send each tester their access instructions (email + beta access code + assigned claim code).
   - Remind them to log out via `/logout` (now part of the header) if they share devices.

Update this file (or add `WAVE2.md`) as more testers go live.
