# diagnose · seed 7

- Take: `docs/spacegraph/video/takes/explore-diagnose.webm`
- Cut: `docs/spacegraph/video/explore-diagnose.mp4`
- Stills: `docs/spacegraph/video/stills/explore-diagnose/`
- Marks: `docs/spacegraph/video/marks-explore-diagnose.json`
- Format: 1440×900, 30 fps, 6.9 s continuous

First take under the full-motion pipeline. It proves the renderer and the marks, not a final cut.

## What worked

| Pattern | Evidence | Verdict |
|---------|----------|---------|
| Attention → Why in one click | `diagnose-02-why-trace` | keep |
| Failed result inspector carries the error, exit code and output | `diagnose-01-failure` | keep |
| Continuous take renders at 30 fps with no freeze frames | cut, 6.9 s | keep |
| Stills cut from the same take stay in sync with the footage | 4 stills | keep |

## What fought back

| Pattern | Evidence | Verdict |
|---------|----------|---------|
| "See this run" banner occupies the top strip for the whole take and competes with the graph | `diagnose-00-open`, `diagnose-01-failure` | change — auto-dismiss after the first interaction, or suppress while recording |
| Beats are too short for commentary (00→03 spans 3.6 s) | marks file | change — pace beats at 3–5 s and add camera moves instead of freezes |
| The seeded detour after the trace is not observable (layout stays lanes) | `diagnose-03-recover` | change — a detour must change something the viewer can see |
| The opening is a static fit, not a motion beat | `diagnose-00-open` | change — open on a slow push-in from the overview |

## Next

- Land the banner auto-dismiss, then re-shoot `diagnose` with paced beats.
- Add a camera beat helper to the explorer: push-in, orbit drift, whip-to-node.
- Write the `trust`, `cost`, `handoff` and `return` themes; `chaos` and `night` after those.
