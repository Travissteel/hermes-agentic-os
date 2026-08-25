# Site images

Drop image files in this folder and reference them by **filename only** in
`site.config.ts` — `src: "hero.webp"`, not `/images/hero.webp`.

Images are entirely optional. A site with none renders text-only, exactly as
the whole network did before this layer existed. That is a supported state.

## The rule that is not negotiable

**Objects and places. Never people presented as ours.**

This brand is a quote-matching service, not the trade. A photo of a smiling
electrician in hi-vis on a site that says "we connect you with local pros" is
the same Gate 1 fabrication as an invented review or a made-up licence number —
it asserts something untrue about who we are.

| Use | Avoid |
|---|---|
| A switchboard, an engine bay, a hand tool | Anyone in branded uniform or hi-vis |
| A streetscape or landmark of the city we serve | "Meet the team" / staff portraits |
| Materials, parts, a work site | Before/after shots implying we did the job |
| Equipment in use, hands on a tool, unbranded | Anything that reads as a company van or premises |

Alt text follows the same rule. Describe what is literally in the frame — "a
residential switchboard with circuit breakers and safety switches" — never
"our electrician upgrading a switchboard".

## What stock images are and are not for

They are conversion furniture. A bare text page reads as a shell next to
competitors, and that costs form submissions.

They are **not** an SEO investment. These files appear on thousands of other
sites and Google knows it. No stock image will ever help a page rank, and a
heavy one will actively hurt it through Core Web Vitals. Never let an image
push the quote form or the money copy below the fold.

## Sourcing

Pexels and Pixabay both permit commercial use without attribution under their
content licences, which covers this use. Record where each file came from in
the `credit` field anyway — it costs nothing and settles any later question
about provenance.

Check the licence at download time rather than assuming. Both sites host some
third-party content under different terms, and a few categories (recognisable
people, trademarks, brand logos on equipment) carry restrictions regardless of
the base licence.

## Preparing files — this part matters

`next.config.ts` sets `images.unoptimized`, because Next's optimiser requires
the paid Cloudflare Images product on Workers. **Nothing downstream will resize
or re-compress these files.** What you commit is what every visitor downloads,
on the mobile connections most of this traffic arrives on.

So before committing anything:

1. **Resize to display size.** Hero ≈1600px wide. Service cards ≈640px. There
   is no reason to ship a 4000px original.
2. **Convert to WebP.** Roughly 30% smaller than JPEG at the same quality.
3. **Target under ~150KB** for a hero, under ~60KB for a card image.
4. **Record the real pixel dimensions** in `width` / `height` in the config.
   These are load-bearing — with `unoptimized` they are the only thing
   reserving space before the file arrives, and wrong values mean layout shift.

```bash
# Resize + convert in one pass (ImageMagick)
magick original.jpg -resize 1600x -quality 82 hero.webp

# Confirm the dimensions you just produced, then copy them into site.config.ts
magick identify hero.webp
```

## Config shape

```ts
images: {
  hero: {
    src: "hero.webp",
    alt: "A residential switchboard with modern circuit breakers",
    width: 1600,
    height: 900,
    credit: "Pexels — photographer name — Pexels License",
  },
},
```

Per sub-service, on the `SubService` entry itself:

```ts
image: {
  src: "switchboard-upgrade.webp",
  alt: "An open switchboard showing labelled circuit breakers and two RCDs",
  width: 640,
  height: 427,
  credit: "Pixabay — Pixabay Content License",
},
```
