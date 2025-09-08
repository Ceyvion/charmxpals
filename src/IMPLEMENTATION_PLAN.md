// Core user flows implementation plan

// NOTE: This file is superseded by the repository Orchestrator.
// Source of truth: orchestrator/plan.json
// UI: /orchestrator    CLI: npm run orchestrator

/*
1. First-time claim flow:
   - User scans QR code or enters code manually
   - System verifies code uniqueness and validity
   - If valid, prompt user to create account (magic link)
   - After account creation, auto-equip default cosmetic
   - Prompt to play first mini-game
   - Offer share card after first game

2. Friend invite flow:
   - User generates invite link with their code
   - Friend claims using the link
   - Both users receive cosmetic reward
   - Nudge to add each other as friends

3. Battle/Compare flow:
   - User selects character
   - Initiate quick battle
   - Display result card with stats delta
   - Option to share or rematch

4. Customization flow:
   - User opens character page
   - Navigate to cosmetics gallery
   - Preview cosmetic item
   - Equip selected cosmetic
*/

// Implementation will be done in the following order:
// 1. Claim flow (API routes and UI)
// 2. Character page
// 3. First mini-game
// 4. Social features (friends, invites)
// 5. Leaderboards and compare features
// 6. Customization features
// 7. Analytics and admin dashboard
