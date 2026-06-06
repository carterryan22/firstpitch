import { affiliateUrl, gearStars, categoryLabel, type GearProduct } from "@platform/gear";

const TIER_LABEL: Record<number, string> = { 1: "Budget", 2: "Standard", 3: "Premium" };

/**
 * Presentational gear card with rating, review count, and a tagged affiliate
 * link. Plain (server-safe) component — usable from server pages and the
 * client quiz alike. Affiliate links are always rel="sponsored nofollow".
 */
export function GearCard({ product, amazonTag }: { product: GearProduct; amazonTag?: string }) {
  const href = affiliateUrl(product, amazonTag);
  return (
    <article className="card flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{categoryLabel(product.category)}</p>
          <h3 className="m-0 text-lg">{product.name}</h3>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-dirt-300" style={{ fontFamily: "var(--font-type)" }}>
            {product.brand} · {product.role}
          </p>
        </div>
        <span className="badge-info whitespace-nowrap">{TIER_LABEL[product.price_tier]}</span>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-warn" aria-hidden>{gearStars(product.rating)}</span>
        <span className="text-ink/70">
          {product.rating.toFixed(1)} · {product.review_count.toLocaleString()} reviews
        </span>
      </div>

      <p className="m-0 text-sm leading-relaxed text-ink/85">{product.blurb}</p>
      <p className="m-0 text-sm italic text-ink/70">“{product.editor_note}”</p>

      {product.safety_note ? (
        <p className="m-0 rounded-none border-l-2 border-danger bg-danger/5 px-3 py-2 text-xs text-ink/80">
          <strong className="uppercase tracking-[0.1em]">Safety:</strong> {product.safety_note}
        </p>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-3 pt-2">
        <span className="text-base" style={{ fontFamily: "var(--font-display)" }}>~${product.price_usd}</span>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="sponsored nofollow noopener noreferrer"
            className="btn-primary no-underline hover:no-underline"
          >
            Shop {product.role} →
          </a>
        ) : (
          <span className="text-xs text-ink/50">Link coming soon</span>
        )}
      </div>
    </article>
  );
}
