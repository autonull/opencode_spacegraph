# audit · seed 13

- Take: `docs/spacegraph/video/takes/explore-audit.webm`
- Cut: `docs/spacegraph/video/explore-audit.mp4`
- Stills: `docs/spacegraph/video/stills/explore-audit/`
- Marks: `docs/spacegraph/video/marks-explore-audit.json`
- Format: 1440×900, 30 fps, 15.3 s continuous

Timeline layout audit of three fixes: wrong fix (extended token lifetime), still failing, then correct fix (stored rotated token).

## What worked

| Pattern | Evidence | Verdict |
|---------|----------|---------|
| Timeline layout exposes fix sequence spatially | `audit-01-timeline` | keep |
| Orbit drift reads as camera motion, not a filter | `audit-02-orbit-drift` | keep |
| Search→focus→inspector flow surfaces failure detail in one motion | `audit-03-wrong-fix`, `audit-04-still-failing`, `audit-05-correct-fix` | keep |
| Whip-to-node lands on the correct fix with intent | `audit-06-whip-to-fix` | keep |
| Fit after detour recovers framing | `audit-07-detour` | keep |

## What fought back

| Pattern | Evidence | Verdict |
|---------|----------|---------|
| "See this run" banner persists through the entire take | every still | change — auto-dismiss after first interaction or while recording |
| Layout switch to timeline lacks a camera beat (static fit) | `audit-00-open` → `audit-01-timeline` | change — open on push-in or orbit to establish the layout |
| Beats are uneven; `audit-02` to `audit-03` spans 0.9 s | marks file | change — pace beats at 3–5 s, use camera moves between search hits |
| Detour cadence still fast; eye never settles on the timeline | `audit-07-detour` | change — slow detour cadence, let camera drift between beats |

## Next

- Land banner auto-dismiss, then re-shoot `audit` with paced beats.
- Add opening camera beat (push-in or orbit) when switching to timeline.
- Slow the search→focus sequence to 3–5 s per result.