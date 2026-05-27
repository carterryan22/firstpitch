import type { Page } from "playwright";
import type { Finding, FindingKind, Persona } from "./types.ts";

interface AuditInput {
  page: Page;
  persona: Persona;
  journey: string;
  step?: string;
  isMobile: boolean;
}

/**
 * Run a battery of page-level heuristics. Returns finding seeds (without
 * persona/journey/capturedAt — those are stamped by the runner).
 */
export async function auditPage(input: AuditInput): Promise<Array<Omit<Finding, "persona" | "journey" | "capturedAt">>> {
  const { page, persona, isMobile } = input;
  const results: Array<Omit<Finding, "persona" | "journey" | "capturedAt">> = [];
  const url = page.url();

  // Wait briefly for the page to settle so heuristics see real content.
  await page.waitForLoadState("domcontentloaded", { timeout: 5_000 }).catch(() => undefined);
  await page.waitForTimeout(150);

  // ── Everything else runs inside the page so we touch the DOM once. ──
  const pageData = await page.evaluate(({ minTap }) => {
    function visible(el: Element): boolean {
      const r = (el as HTMLElement).getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      const s = getComputedStyle(el as HTMLElement);
      return s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0";
    }
    function accessibleName(el: Element): string {
      const aria = el.getAttribute("aria-label");
      if (aria) return aria.trim();
      const labelledBy = el.getAttribute("aria-labelledby");
      if (labelledBy) {
        const ref = document.getElementById(labelledBy);
        if (ref?.textContent) return ref.textContent.trim();
      }
      const title = el.getAttribute("title");
      if (title) return title.trim();
      const text = (el as HTMLElement).innerText?.trim();
      if (text) return text;
      // <input> needs <label for=id> OR a wrapping <label>
      const id = el.getAttribute("id");
      if (id) {
        const lab = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (lab?.textContent) return lab.textContent.trim();
      }
      const wrappingLabel = el.closest("label");
      if (wrappingLabel?.textContent) return wrappingLabel.textContent.trim();
      const placeholder = el.getAttribute("placeholder");
      if (placeholder) return placeholder.trim();
      return "";
    }
    function isVisuallyHidden(el: Element): boolean {
      // Skip-to-content / sr-only links are intentionally 1px until focused.
      const s = getComputedStyle(el as HTMLElement);
      const r = (el as HTMLElement).getBoundingClientRect();
      if (r.width <= 2 && r.height <= 2) return true;
      if (s.position === "absolute" && (s.clip === "rect(0px, 0px, 0px, 0px)" || s.clipPath === "inset(50%)")) return true;
      if (el.classList.contains("sr-only")) return true;
      return false;
    }
    function rgb(s: string): [number, number, number] | null {
      const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return null;
      return [Number(m[1]), Number(m[2]), Number(m[3])];
    }
    function lum([r, g, b]: [number, number, number]): number {
      const f = (c: number) => {
        const x = c / 255;
        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    }
    function contrast(a: string, b: string): number | null {
      const ra = rgb(a), rb = rgb(b);
      if (!ra || !rb) return null;
      const la = lum(ra), lb = lum(rb);
      const [hi, lo] = la > lb ? [la, lb] : [lb, la];
      return (hi + 0.05) / (lo + 0.05);
    }
    function effectiveBg(el: Element): string {
      let node: Element | null = el;
      while (node) {
        const c = getComputedStyle(node as HTMLElement).backgroundColor;
        if (c && !/rgba\(.+,\s*0\)$/.test(c)) return c;
        node = node.parentElement;
      }
      return "rgb(255,255,255)";
    }

    const out: {
      url: string;
      title: string;
      h1Count: number;
      bodyTextLen: number;
      avgWordsPerSentence: number;
      hardWordRatio: number;
      smallTapTargets: Array<{ tag: string; name: string; w: number; h: number }>;
      unlabeledInputs: Array<{ tag: string; type: string; name: string }>;
      iconOnlyButtons: Array<{ html: string }>;
      lowContrastCtas: Array<{ name: string; ratio: number }>;
      hasPrimaryCta: boolean;
      hasNextLink: boolean;
      mainTextSample: string;
      interactiveCount: number;
    } = {
      url: location.href,
      title: document.title,
      h1Count: document.querySelectorAll("h1").length,
      bodyTextLen: (document.body.innerText ?? "").length,
      avgWordsPerSentence: 0,
      hardWordRatio: 0,
      smallTapTargets: [],
      unlabeledInputs: [],
      iconOnlyButtons: [],
      lowContrastCtas: [],
      hasPrimaryCta: false,
      hasNextLink: false,
      mainTextSample: "",
      interactiveCount: 0,
    };

    // Reading level on the visible main text.
    const main = document.querySelector("main") ?? document.body;
    const text = (main as HTMLElement).innerText ?? "";
    out.mainTextSample = text.slice(0, 1200);
    const sentences = text.split(/[.!?]+\s/).filter((s) => s.trim().length > 0);
    const words = text.split(/\s+/).filter(Boolean);
    if (sentences.length > 0) out.avgWordsPerSentence = words.length / sentences.length;
    if (words.length > 0) {
      const hard = words.filter((w) => w.replace(/[^a-zA-Z]/g, "").length >= 10).length;
      out.hardWordRatio = hard / words.length;
    }

    function isInlineInProse(el: Element): boolean {
      // Inline anchors inside paragraphs/spans are typically narrative links
      // (e.g. "sourced from <a>USA Baseball</a>"). They are tappable but not
      // primary tap targets; treat them as informational, not blockers.
      if (el.tagName !== "A") return false;
      const p = el.parentElement;
      if (!p) return false;
      const tag = p.tagName;
      return tag === "P" || tag === "SPAN" || tag === "LI" || tag === "EM" || tag === "STRONG";
    }

    // Interactive elements: buttons, role=button, links
    const buttons = Array.from(document.querySelectorAll("button, [role=button], a[href]"))
      .filter(visible)
      .filter((el) => !isVisuallyHidden(el));
    out.interactiveCount = buttons.length;
    for (const b of buttons) {
      const r = (b as HTMLElement).getBoundingClientRect();
      const name = accessibleName(b);
      // Tap targets (mobile only) — skip inline narrative links
      if ((r.width < minTap || r.height < minTap) && !isInlineInProse(b)) {
        out.smallTapTargets.push({ tag: b.tagName.toLowerCase(), name: name.slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) });
      }
      if (!name) {
        // Icon-only without aria-label
        const hasSvg = b.querySelector("svg, img");
        if (hasSvg) {
          out.iconOnlyButtons.push({ html: (b as HTMLElement).outerHTML.slice(0, 160) });
        }
      }
      // Contrast on prominent buttons (>=80px wide treated as CTA candidate)
      if (b.tagName === "BUTTON" && r.width >= 80 && r.height >= 24) {
        const cs = getComputedStyle(b as HTMLElement);
        const bg = cs.backgroundColor && !/rgba\(.+,\s*0\)$/.test(cs.backgroundColor) ? cs.backgroundColor : effectiveBg(b);
        const ratio = contrast(cs.color, bg);
        if (ratio !== null && ratio < 3) {
          out.lowContrastCtas.push({ name: name.slice(0, 40), ratio: Math.round(ratio * 100) / 100 });
        }
      }
    }

    // Inputs (text/select/textarea) without labels
    const inputs = Array.from(
      document.querySelectorAll("input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea"),
    ).filter(visible);
    for (const i of inputs) {
      const name = accessibleName(i);
      if (!name) {
        out.unlabeledInputs.push({
          tag: i.tagName.toLowerCase(),
          type: (i as HTMLInputElement).type ?? "",
          name: i.getAttribute("name") ?? "",
        });
      }
    }

    // Primary CTA / next step heuristic
    out.hasPrimaryCta = !!document.querySelector(
      "button[type=submit], button.btn-primary, a.btn-primary, [data-primary], [data-cta]",
    ) || buttons.some((b) => /save|create|start|continue|next|begin|sign up|generate|build|add/i.test((b as HTMLElement).innerText ?? ""));
    out.hasNextLink = buttons.length > 0;

    return out;
  }, { minTap: isMobile ? 40 : 28 });

  const push = (
    kind: FindingKind,
    severity: Finding["severity"],
    message: string,
    suggestion: string,
    detail?: string,
  ) => {
    results.push({ kind, severity, message, suggestion, url, detail, step: input.step });
  };

  // Empty state / dead end
  if (pageData.interactiveCount === 0 && pageData.bodyTextLen < 200) {
    push(
      "empty-state",
      "major",
      `Page has almost no content and no interactive controls (title: ${pageData.title || "—"}).`,
      "Add a primary CTA or helpful empty-state copy that points the user to their next action.",
    );
  } else if (!pageData.hasPrimaryCta && pageData.interactiveCount > 0) {
    push(
      "deadend",
      "minor",
      "No identifiable primary CTA on this page.",
      "Promote the most common next action with `btn-primary` styling or text like Save / Continue / Add.",
    );
  }

  if (pageData.h1Count === 0) {
    push(
      "deadend",
      "minor",
      "Page has no <h1>.",
      "Give every page a single <h1> so users (and screen readers) know where they are.",
    );
  }

  // Tap targets — only flag on mobile journeys
  if (isMobile && pageData.smallTapTargets.length > 0) {
    push(
      "tap-target",
      pageData.smallTapTargets.length > 4 ? "major" : "minor",
      `${pageData.smallTapTargets.length} interactive element(s) under 40×40 px on a touch viewport.`,
      "Increase padding (≥12px y, ≥16px x) or min-height: 44px on tap targets. Critical for kids and gloved parents.",
      pageData.smallTapTargets.slice(0, 6).map((t) => `${t.tag} "${t.name}" ${t.w}×${t.h}`).join("; "),
    );
  }

  if (pageData.unlabeledInputs.length > 0) {
    push(
      "missing-label",
      "major",
      `${pageData.unlabeledInputs.length} input(s) without an accessible label.`,
      "Add <label for=id> or aria-label. Required for screen readers and password managers.",
      pageData.unlabeledInputs.slice(0, 6).map((i) => `${i.tag}[type=${i.type}, name=${i.name || "—"}]`).join("; "),
    );
  }

  if (pageData.iconOnlyButtons.length > 0) {
    push(
      "icon-only-button",
      "minor",
      `${pageData.iconOnlyButtons.length} icon-only control(s) without text or aria-label.`,
      "Add aria-label to icon buttons (e.g. <button aria-label=\"Delete player\">🗑</button>).",
    );
  }

  if (pageData.lowContrastCtas.length > 0) {
    push(
      "low-contrast",
      "major",
      `${pageData.lowContrastCtas.length} CTA(s) appear to fall below 3:1 contrast.`,
      "Darken the button background or lighten the label. WCAG AA requires ≥4.5:1 for body text, ≥3:1 for large text/UI.",
      pageData.lowContrastCtas.slice(0, 6).map((c) => `"${c.name}" ratio=${c.ratio}`).join("; "),
    );
  }

  // Reading level — only enforce for the youth persona
  if (persona === "player" && pageData.bodyTextLen > 250) {
    if (pageData.avgWordsPerSentence > 18 || pageData.hardWordRatio > 0.18) {
      push(
        "reading-level",
        "major",
        `Copy is dense for a youth reader (avg words/sentence=${pageData.avgWordsPerSentence.toFixed(1)}, hard-word ratio=${(pageData.hardWordRatio * 100).toFixed(0)}%).`,
        "Aim for ≤14 words per sentence and prefer 1-2 syllable words. Reuse the corpus `kid_friendly.explain` copy already on each drill.",
        pageData.mainTextSample.slice(0, 200),
      );
    }
  }

  return results;
}
