# Batch candidates — how to produce a batch of sites

`candidates.json` is the input to the batch scaffolder. One entry = one future
site. The workflow moves each entry through four `status` values:

```
seed  →  draft  →  approved  →  scaffolded
(you)   (AI)      (you)        (batch runner)
```

## The flow

1. **seed (you):** you pick the niche + location and do the manual green-light
   SERP check (this is human judgement — the AI never invents a verdict). Add a
   minimal entry: `service`, `phrase`, `city`, `state`, `stateAbbr`, `postcode`,
   and your `greenLight` verdict + notes. Set `status: "seed"`.
2. **draft (AI):** run the Claude skill **`/leadgen-batch-research`**. For each
   `seed` row it uses web search to fill **real** neighbouring `suburbs`
   (with correct postcodes) and to draft `brand`, `theme`, `subServices`,
   `faqs`, `facts`, and `targetKeywords` — obeying the content gates in
   `~/.hermes/skills/leadgen/SKILL.md` (truth / specificity / uniqueness /
   never interlink / AU spelling) and the referral VOICE RULE. It flips the row
   to `status: "draft"`.
3. **approved (you):** review the drafted row. Confirm the **`domain`** you
   bought (or will buy) and the contact **`email`**, tweak any copy, then set
   `status: "approved"`. Only approved rows get scaffolded.
4. **scaffolded (batch runner):** run the batch scaffolder. It scaffolds every
   approved row and flips it to `status: "scaffolded"`.

## Commands

```bash
# Scaffold all approved candidates (build-verify + private repo + push + register)
bun ~/antigravity/leadgen/scripts/batch-new-sites.ts

# Dry run — scaffold locally, no GitHub repo / push
bun ~/antigravity/leadgen/scripts/batch-new-sites.ts --dry-run

# One candidate only (by domain slug, e.g. towinggeelong)
bun ~/antigravity/leadgen/scripts/batch-new-sites.ts --only <slug>

# After buying the domains — deploy scaffolded candidates to Cloudflare
bun ~/antigravity/leadgen/scripts/batch-new-sites.ts --deploy
bun ~/antigravity/leadgen/scripts/batch-new-sites.ts --deploy --only <slug>
```

`--deploy` requires `CF_API_TOKEN` + `CF_ACCOUNT_ID` in `~/.hermes/.env`; without
them it skips cleanly (scaffolding + push are unaffected).

## Row schema

| Field | Filled by | Notes |
|---|---|---|
| `status` | flow | `seed` → `draft` → `approved` → `scaffolded` |
| `service` | you | e.g. "Emergency Tree Removal" (title case) |
| `phrase` | you | mid-sentence form, e.g. "emergency tree removal" |
| `city`,`state`,`stateAbbr`,`postcode` | you | AU location, 60k–400k pop or capital suburb |
| `population` | AI | rough city population (band check) |
| `greenLight` | you | `{ verdict, notes }` — your manual SERP judgement |
| `brand` | AI | referral-style, e.g. "<City> <Service> Quotes" |
| `domain` | you | www form; the domain slug drives the repo + worker name |
| `email` | you | contact address (reply-to on leads) |
| `phone` | you | optional; empty string hides phone UI |
| `theme` | AI | `{ primary, accent }` hex — niche-appropriate |
| `launchTarget` | AI/you | pages before the site graduates launch → maintain (default 15) |
| `targetKeywords` | AI | purchase-intent phrases the money pages target |
| `suburbs` | AI | `[{ name, postcode }]` — **real** neighbouring suburbs |
| `subServices` | AI | `[{ slug, name, blurb }]` — real service variants |
| `faqs` | AI | `[{ question, answer }]` — true, gate-compliant |
| `facts` | AI | `[{ label, value }]` — short, true, citable |

The one example row is `status: "draft"` so it will not scaffold. Delete it or
flip it to `approved` once it's real. **Never interlink network sites** — no
shared content, footers, or cross-links, ever.
