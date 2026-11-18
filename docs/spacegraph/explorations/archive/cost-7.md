# cost · seed 7

- Take: `docs/spacegraph/video/takes/explore-cost.webm`
- Cut: `docs/spacegraph/video/explore-cost.mp4`
- Stills: `docs/spacegraph/video/stills/explore-cost/`
- Marks: `docs/spacegraph/video/marks-explore-cost.json`
- Format: 1440×900, 30 fps, 9.6 s continuous

Lanes layout with cost lens; push-in toward session node shows cost accumulation.

## What worked

| Pattern | Evidence | Verdict |
|---------|----------|---------|
| Lanes layout with cost lens surfaces token/cost per node | `cost-01-lanes`, `cost-02-cost-lens` | keep |
| Push-in to session node reads as deliberate camera motion | `cost-03-push-in` | keep |
| Fit after detour recovers framing | `cost-05-fit` | keep |

## What fought back

| Pattern | Evidence | Verdict |
|---------|----------|---------|
| "See this run" banner persists through the entire take | every still | change — auto-dismiss after first interaction or while recording |
| Cost lens toggle has no visual transition; snaps on | `cost-02-cost-lens` | change — animate lens transition (fade/color shift over 500–800 ms) |
| Opening static fit on lanes; no establishing motion | `cost-00-open` → `cost-01-lanes` | change — open on push-in to session, then settle on lanes |
| Beats are too short; `cost-02` to `cost-03` spans 3.0 s but lens just appeared | marks file | change — hold on cost lens result for 3–5 s before push-in |
| Detour at `cost-04` is unmotivated; no visible change in the graph | `cost-04-detour` | change — detour must change something the viewer can see (layout, lens, selection) |
| Fit at `cost-05` is 0.16 s after detour; no time to read the frame | marks file | change — pace fit as its own 3–5 s beat, not a snap recovery |

## Next

- Land banner auto-dismiss, then re-shoot `cost` with paced beats.
- Animate cost lens transition; it's a state change, not a snap.
- Add opening push-in; hold on cost lens result before camera moves.
- Ensure every detour produces a visible change; pace fit as a beat.