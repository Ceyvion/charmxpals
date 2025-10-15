# 2025 Color Trend Research

Last updated: 2025-10-04

## Primary Sources

1. **WGSN + Coloro 2025 Forecast** — "Future Dusk" (Coloro 129-35-18) named Colour of the Year 2025. Supporting shades cited in the 2025 palette: "Transcendent Pink" (015-80-25), "Aquatic Awe" (115-50-25), "Sunset Coral" (028-45-26), and "Ray Flower" (040-70-44).  
   Source: [WGSN x Coloro Colour of the Year 2025](https://www.wgsn.com/en/coloro-colour-year-2025-future-dusk) *(press release, May 2023)*.

2. **Pantone** — 2024 Colour of the Year "Peach Fuzz" (13-1023) continues to trend in 2025 across beauty/fashion moodboards for its tactile calmness.  
   Source: [Pantone Colour of the Year 2024 — Peach Fuzz](https://www.pantone.com/color-of-the-year/2024).

3. **Adobe Color Trend Report 2025** — Highlights "Luminous Pastels", "Digital Optimism" and "Eco-Natural" palettes combining soft lilacs, airy peaches and vibrant aqua accents.  
   Source: [Adobe Color Trends 2025](https://blog.adobe.com/en/topics/design/color).

4. **Pinterest Predicts 2025** — Consumers searching "pastel goth", "romantic goth aesthetic" and "hyper-feminine sci-fi" palettes combining dark violets with blush and iridescent teal.  
   Source: [Pinterest Predicts 2025](https://newsroom.pinterest.com/en/post/pinterest-predicts-2025).

5. **99designs by Vista 2025 Trends** — "Cyber-Sirens" and "Whimsical Bloom" palettes merge future-tech blues with soft petal hues for female-led startups.  
   Source: [99designs 2025 Graphic Design Trends](https://99designs.com/blog/trends/graphic-design-trends/).

## Key Insights
- **Deep indigo-plum** foundations (Future Dusk) add sophistication and complement both light and bold accents.
- **Tactile peaches** (Peach Fuzz / Sunset Coral) bring warmth and human touch prized in wellness & collectibles communities.
- **Ethereal pink-lilacs** (Transcendent Pink) communicate femininity without skewing juvenile; works well in gradients.
- **Iridescent aqua/teal** accents (Aquatic Awe) keep the brand feeling modern/tech-forward and pair with 3D/glass UI.
- **Soft neutral rose-beige** prevents harsh contrast and supports readability.

## Candy Casual Benchmark
- **Candy Crush Saga** (King) — relies on luminous, high-chroma pastels over soft gradients (sky blues blending to pinks) with jelly-like highlights. Key moves: gradient skies behind characters, glassy cards, and bright accent buttons with white inner glows.
- **Royal Match / Toon Blast** — favor "candy wrapper" depth: lighter radial glows behind cards, warm shadow hues (violet or magenta rather than black), and accent strips in lime/aqua to energize CTAs.
- **Pattern takeaway** — keep the palette *light-first*, with only small doses of deep plum for contrast. Surfaces lean toward milky transparencies; shadows get colored (violet/pink) instead of grayscale.

## Proposed Palette — "Candy Cloud"

| Token | Hex | Role |
| --- | --- | --- |
| Bubble Sky | `#F6F7FF` | Primary background wash |
| Parfait Pink | `#FF9FD5` | Gradient start / hero accent |
| Dreamy Lilac | `#C6A5FF` | Gradient mid / shadow tint |
| Splash Aqua | `#7FEAFF` | Gradient end / active state |
| Citrus Glaze | `#FFC66B` | Warm counterpoint for CTAs and stats |
| Plum Sugar | `#301243` | Primary text / icon color |
| Frosted Glass | `rgba(255,255,255,0.72)` | Panels, cards, glassmorphism base |

### Implementation Notes
- Shift the global gradient to Parfait Pink → Dreamy Lilac → Splash Aqua with a soft white base (Bubble Sky).
- Recast panel/card backgrounds to Frosted Glass with colored borders (Parfait Pink at 30% alpha) to preserve glass depth on a light canvas.
- Reserve Plum Sugar (deep plum) for text, icons, and nav to guarantee AA contrast (ratio ≥ 6:1 on Bubble Sky).
- Use Citrus Glaze for progress fills, highlight chips, and warm glow details to balance the cool pastel core.
- Apply colored shadows (mix of Dreamy Lilac and Parfait Pink) rather than black to keep the UI airy.
