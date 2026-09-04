import Link from "next/link";
import { SITE } from "@/site.config";
import type {
  GalleryItem,
  LongformSection as LongformSectionData,
  ProcessStep,
  Stat,
  ValueCard,
} from "@/site.config";
import { SiteImage } from "@/components/site-image";
import { Icon } from "@/components/icons";

/**
 * Home-page sections, each driven by an optional block in site.config.ts.
 *
 * Every one of these returns null when its config is absent, so the home page
 * can render them unconditionally and a site that has only filled in the
 * basics falls back to the lean page the network shipped before this layer —
 * that is a supported state, not a broken one.
 *
 * The prose sections (longform, local area) are where the ranking substance
 * lives. See LongformSection in lib/site-types.ts for the word counts.
 */

export function SectionHead({
  eyebrow,
  heading,
  intro,
  id,
}: {
  eyebrow?: string;
  heading: string;
  intro?: string;
  id?: string;
}) {
  return (
    <div className="section-head">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 id={id} className="h2">
        {heading}
      </h2>
      {intro && <p className="lede">{intro}</p>}
    </div>
  );
}

export function StatsStrip({ stats }: { stats?: Stat[] }) {
  if (!stats?.length) return null;
  return (
    <section className="band--dark">
      <div className="container py-12">
        <div className="stats-strip">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="stat-value text-accent">{s.value}</p>
              <p className="mt-2 text-sm font-medium text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Shared renderer for the differentiators and promises blocks — same card,
 * different heading. Layout is `.card-grid` (auto-fit) rather than a fixed
 * column count, because these lists are config-driven and run to three, four
 * or six entries.
 */
function ValueCardGrid({ cards }: { cards: ValueCard[] }) {
  return (
    <div className="card-grid">
      {cards.map((c) => (
        <div key={c.title} className="card p-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius)] bg-accent/15 text-accent-ink">
            <Icon name={c.icon} className="h-6 w-6" />
          </span>
          <h3 className="h3 mt-4">{c.title}</h3>
          <p className="mt-2 leading-relaxed text-muted">{c.body}</p>
        </div>
      ))}
    </div>
  );
}

export function Differentiators({ cards }: { cards?: ValueCard[] }) {
  if (!cards?.length) return null;
  return (
    <section className="band">
      <div className="container">
        <SectionHead
          eyebrow="What sets us apart"
          heading={`Why ${SITE.location.city} homeowners call us`}
        />
        <ValueCardGrid cards={cards} />
      </div>
    </section>
  );
}

export function Promises({ cards }: { cards?: ValueCard[] }) {
  if (!cards?.length) return null;
  return (
    <section className="band band--tint">
      <div className="container">
        <SectionHead eyebrow="Our promise" heading="What you can expect from us" />
        <ValueCardGrid cards={cards} />
      </div>
    </section>
  );
}

export function ProcessSteps({ steps }: { steps?: ProcessStep[] }) {
  if (!steps?.length) return null;
  return (
    <section className="band">
      <div className="container">
        <SectionHead
          eyebrow="Getting started"
          heading={`Our ${SITE.service.phrase} process`}
          intro="A straightforward path from first enquiry to finished work, planned around your property and the level of work involved."
        />
        <div className="card-grid">
          {steps.map((s, i) => (
            <div key={s.title} className="card p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent font-bold text-on-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Icon name={s.icon} className="h-6 w-6 text-accent-ink" />
              </div>
              <h3 className="h3 mt-4">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AboutBlock({
  about,
}: {
  about?: { eyebrow: string; heading: string; body: string[] };
}) {
  if (!about?.body?.length) return null;
  const image = SITE.images?.about;
  return (
    <section className="band">
      <div className="container grid items-start gap-10 md:grid-cols-2">
        {image && (
          <SiteImage
            image={image}
            sizes="(max-width: 768px) 100vw, 560px"
            className="h-72 w-full rounded-[var(--radius-lg)] object-cover md:sticky md:top-24 md:h-[28rem]"
          />
        )}
        <div className={image ? "" : "mx-auto max-w-3xl"}>
          <p className="eyebrow">{about.eyebrow}</p>
          <h2 className="h2 mt-4">{about.heading}</h2>
          <div className="prose-block mt-5">
            {about.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <Link href="/about" className="btn btn--primary mt-7">
            More about us
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Gallery grid. `limit` caps the home page at eight tiles; /gallery passes
 * none and renders the lot.
 */
export function GalleryGrid({
  items,
  limit,
}: {
  items: GalleryItem[];
  limit?: number;
}) {
  const shown = limit ? items.slice(0, limit) : items;
  return (
    <div className="gallery-grid">
      {shown.map((item, i) => (
        <figure
          key={item.src}
          className={`gallery-item ${i === 0 ? "gallery-item--featured" : "aspect-square"}`}
        >
          <SiteImage
            image={item}
            sizes={
              i === 0
                ? "(max-width: 768px) 50vw, 560px"
                : "(max-width: 768px) 50vw, 280px"
            }
          />
          <figcaption className="gallery-caption">{item.caption}</figcaption>
        </figure>
      ))}
    </div>
  );
}

export function GallerySection({ items }: { items?: GalleryItem[] }) {
  if (!items?.length) return null;
  return (
    <section className="band band--tint">
      <div className="container">
        <SectionHead
          eyebrow="Recent projects"
          heading={`Our recent work in ${SITE.location.city}`}
          intro="Examples of the preparation and workmanship behind each job. Every property is assessed on its own condition and access."
        />
        <GalleryGrid items={items} limit={8} />
        {items.length > 8 && (
          <div className="mt-10 text-center">
            <Link href="/gallery" className="btn btn--ghost">
              View the full gallery
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Image-flanked prose. Alternates the image side per index so a run of three
 * of these reads as a designed rhythm rather than three identical rows, and
 * `order` rather than DOM order keeps the heading before the image for screen
 * readers in both directions.
 */
export function LongformSections({
  sections,
}: {
  sections?: LongformSectionData[];
}) {
  if (!sections?.length) return null;
  return (
    <>
      {sections.map((s, i) => (
        <section
          key={s.id}
          id={s.id}
          className={`band ${i % 2 === 0 ? "band--tint" : ""}`}
        >
          <div className="container">
            <SectionHead
              eyebrow={s.eyebrow}
              heading={s.heading}
              intro={s.intro}
              id={`${s.id}-heading`}
            />
            {/* items-start, not items-center: these prose columns run 250-450
                words and the image column is a fixed height, so centring left
                the photo floating in the middle of a tall band of whitespace.
                Sticky keeps it in view while the copy scrolls past it. */}
            <div className="grid items-start gap-10 md:grid-cols-2">
              {s.image && (
                <SiteImage
                  image={s.image}
                  sizes="(max-width: 768px) 100vw, 520px"
                  className={`h-64 w-full rounded-[var(--radius-lg)] object-cover md:sticky md:top-24 md:h-96 ${
                    i % 2 === 0 ? "md:order-1" : "md:order-2"
                  }`}
                />
              )}
              <div
                className={`prose-block ${
                  s.image ? (i % 2 === 0 ? "md:order-2" : "md:order-1") : "mx-auto max-w-3xl"
                }`}
              >
                {s.body.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
              </div>
            </div>
          </div>
        </section>
      ))}
    </>
  );
}

export function LocalAreaSection({
  localArea,
}: {
  localArea?: {
    eyebrow: string;
    heading: string;
    intro: string;
    body: string[];
  };
}) {
  if (!localArea?.body?.length) return null;
  return (
    <section className="band">
      <div className="container">
        <SectionHead
          eyebrow={localArea.eyebrow}
          heading={localArea.heading}
          intro={localArea.intro}
        />
        {/* Two columns of prose at desktop width: six paragraphs in a single
            72rem measure is an unreadable wall, and this block is long by
            design because the suburb-level detail in it is the ranking asset. */}
        <div className="prose-block mx-auto max-w-4xl md:columns-2 md:gap-10 [&>p]:break-inside-avoid">
          {localArea.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
