const STORAGE_KEY = "musica.last-menu";
const SLUG_PATTERN = /^[a-z0-9-]{3,60}$/;

export interface LastMenu {
  slug: string;
  stageName: string;
}

export function readLastMenu(): LastMenu | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<LastMenu> | null;
    return value && typeof value.slug === "string" && SLUG_PATTERN.test(value.slug) &&
      typeof value.stageName === "string" && value.stageName.length <= 80
      ? { slug: value.slug, stageName: value.stageName }
      : null;
  } catch {
    return null;
  }
}

export function rememberLastMenu(menu: LastMenu): void {
  if (typeof window === "undefined" || !SLUG_PATTERN.test(menu.slug)) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      slug: menu.slug,
      stageName: menu.stageName.slice(0, 80),
    }));
    window.dispatchEvent(new Event("musica:last-menu"));
  } catch {
    // A blocked storage API must not prevent guests from opening the menu.
  }
}

export function permanentQrUrl(slug: string, origin: string): string {
  if (!SLUG_PATTERN.test(slug)) throw new Error("Invalid musician slug");
  const url = new URL(origin);
  const preview = url.hostname.match(/^(?:[a-z0-9-]+--)?(musicaalacarta|themusicmenu)\.netlify\.app$/);
  if (preview) url.hostname = `${preview[1]}.netlify.app`;
  return new URL(`/q/${slug}`, url.origin).href;
}
