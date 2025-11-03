# Beta Latency Log Template

Use this as a quick reference when you spin up a shared spreadsheet for timing the claim flow. Copy the headers below into Google Sheets or Notion, then grant edit access to the tester cohort.

| Timestamp | Tester | Device | Network | Location | Code Type | Submit → Challenge (ms) | Challenge → Claimed (ms) | Claimed → Inventory (ms) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2024-11-08 14:12 PT | Jamie | iPhone 14 (iOS 17.5) | 5G | SF, CA | Wave 1 | 420 | 581 | 312 | Slight spike during inventory sync; retry stable |

### Logging Tips

- Ask testers to capture **device + OS + browser**. It makes reproducing edge cases much faster.
- If a step logs `> 600 ms`, request a quick screen recording so we can compare timings.
- Encourage testers to note whether the code was fresh or already claimed—double claims should read as `0 ms` in the claim columns.
- When you create a fresh sheet, add a hidden “Raw” tab for unfiltered data so ops can pull pivot tables later.
