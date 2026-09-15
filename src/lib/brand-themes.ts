/**
 * Brokerage colour presets, applied per agent (`agents.brand_theme`).
 *
 * A preset overrides the theme tokens from globals.css for that agent's
 * dashboard and all of their clients'. It is a designed set, not two hex
 * codes: every text-on-background pair was checked against WCAG AA before
 * being added, and a new preset must be checked the same way.
 *
 * What a preset never overrides:
 * - `--destructive`. Red means "danger" (the wire-fraud warning, removals)
 *   whatever brand the agent works under; semantic colour is not branding.
 * - Fonts. Brand typefaces are licensed; colour alone carries the identity.
 *
 * Light mode only, matching the app (dark mode is not wired up).
 */

type Tokens = Record<`--${string}`, string>;

type BrandTheme = {
  /** Shown wherever an agent picks a theme. */
  label: string;
  /** Where the values were taken from, so they can be re-checked. */
  source: string;
  tokens: Tokens;
};

export const BRAND_THEMES = {
  sothebys: {
    label: "Sotheby's International Realty",
    source:
      "Computed styles on sothebysrealty.com and an affiliate site (an affiliate brokerage site), 2026-09-14: " +
      "navy #002349 carries headers, logo block and primary buttons; deep navy #001731; gold #C29B40 " +
      "used sparingly as an accent; neutral greys and white grounds.",
    tokens: {
      // Neutral, slightly cool grounds — the brand has no warm cream.
      "--background": "#F6F7F9",
      "--foreground": "#1F2329",
      "--card": "#FFFFFF",
      "--card-foreground": "#1F2329",
      "--popover": "#FFFFFF",
      "--popover-foreground": "#1F2329",

      // Navy is the brand colour.
      "--primary": "#002349",
      "--primary-foreground": "#FFFFFF",
      "--secondary": "#EEF1F4",
      "--secondary-foreground": "#001731",
      "--muted": "#EEF1F4",
      "--muted-foreground": "#5A6069",
      "--accent": "#E5EBF2",
      "--accent-foreground": "#001731",
      "--border": "#DCE1E7",
      "--input": "#DCE1E7",
      "--ring": "#002349",

      "--chart-1": "#002349",
      "--chart-2": "#C29B40",
      "--chart-3": "#5B7FA6",
      "--chart-4": "#8C6D2A",
      "--chart-5": "#9AA5B1",

      // A navy sidebar, like the brand's own site header. Gold appears only
      // here, on navy (6.0:1) — gold text on white is 2.6:1 and never used.
      "--sidebar": "#002349",
      "--sidebar-foreground": "#FFFFFF",
      "--sidebar-primary": "#C29B40",
      "--sidebar-primary-foreground": "#001731",
      "--sidebar-accent": "#0E3A69",
      "--sidebar-accent-foreground": "#FFFFFF",
      "--sidebar-border": "#12375F",
      "--sidebar-ring": "#C29B40",
    },
  },
} satisfies Record<string, BrandTheme>;

export type BrandThemeKey = keyof typeof BRAND_THEMES;

/**
 * CSS for an agent's preset, or null for the default Harbour look (including
 * a key this build doesn't know, so a newer database never breaks older code).
 */
export function brandThemeCss(key: string | null | undefined): string | null {
  if (!key || !(key in BRAND_THEMES)) return null;
  const { tokens } = BRAND_THEMES[key as BrandThemeKey];
  const body = Object.entries(tokens)
    .map(([name, value]) => `${name}:${value};`)
    .join("");
  // `:root:root` outranks the `:root` block in globals.css regardless of which
  // stylesheet lands later in the document.
  return `:root:root{${body}}`;
}
