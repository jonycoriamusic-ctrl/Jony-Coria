export function publicMediaUrl(url: string, version: number): string {
  if (!url) return "";
  return `${url}${url.includes("?") ? "&" : "?"}v=${version}`;
}
