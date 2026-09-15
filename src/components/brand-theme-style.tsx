import { brandThemeCss } from "@/lib/brand-themes";

/**
 * Applies the agent's brokerage preset to the whole document.
 *
 * A <style> element rather than a class on the app shell: dialogs, dropdowns
 * and toasts render in portals outside the shell, and would otherwise keep the
 * default colours. Rendered on the server, so there's no flash of the default
 * palette before the brand appears.
 *
 * The CSS comes only from presets defined in code — never from user input —
 * which is what makes injecting it safe.
 */
export function BrandThemeStyle({ theme }: { theme: string | null }) {
  const css = brandThemeCss(theme);
  if (!css) return null;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
