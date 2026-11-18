# trust · seed 5

- Take: `docs/spacegraph/video/takes/explore-trust.webm`
- Cut: `docs/spacegraph/video/explore-trust.mp4`
- Stills: `docs/spacegraph/video/stills/explore-trust/`
- Marks: `docs/spacegraph/video/marks-explore-trust.json`
- Format: 1440×900, 30 fps, 11.5 s continuous

Hierarchy layout with trust lens enabled; orbit drift shows unverified nodes in context.

## What worked

| Pattern | Evidence | Verdict |
|---------|----------|---------|
| Hierarchy layout with trust lens colors unverified nodes distinctly | `trust-01-hierarchy`, `trust-02-trust-lens` | keep |
| Orbit drift in hierarchy reads as a real camera orbit | `trust-03-orbit-drift` | keep |
| Fit after detour recovers framing | `trust-05-fit` | keep |

## What fought back

| Pattern | Evidence | Verdict |
|---------|----------|---------|
| "See this run" banner persists through the entire take | every still | change — auto-dismiss after first interaction or while recording |
| Trust lens toggle has no visual transition; snaps on | `trust-02-trust-lens` | change — animate lens transition (fade/color shift over 500–800 ms) |
| Opening static fit on hierarchy; no establishing motion | `trust-00-open` → `trust-01-hierarchy` | change — open on push-in to root, then settle on hierarchy |
| Beats are too short; `trust-02` to `trust-03` spans 4.0 s but lens just appeared | marks file | change — hold on trust lens result for 3–5 s before orbit drift |
| Detour at `trust-04` is unmotivated; no visible change in the graph | `trust-04-detour` | change — detour must change something the viewer can see (layout, lens, selection) |

## Next

- Land banner auto-dismiss, then re-shoot `trust` with paced beats.
- Animate trust lens transition; it's a state change, not a snap.
- Add opening push-in; hold on trust lens result before camera moves.
- Ensure every detour produces a visible change.