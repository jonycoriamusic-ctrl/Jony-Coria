import type { PublicProfile, SocialLink } from "@musica/contracts";
import QRCode from "qrcode";
import { publicMediaUrl } from "./public-media";

type PrintCard = { canvas: HTMLCanvasElement; pageWidth: number; pageHeight: number };

const A6 = { width: 1240, height: 1748, pageWidth: 297.64, pageHeight: 419.53 };
const A5 = { width: 1748, height: 2480, pageWidth: 419.53, pageHeight: 595.28 };

const socialNames: Record<string, string> = {
  instagram: "IG", youtube: "YT", facebook: "FB", tiktok: "TikTok",
  twitter: "X", x: "X", spotify: "Spotify", soundcloud: "SoundCloud",
};

export function socialHandle(link: SocialLink): string {
  try {
    const url = new URL(link.url);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const path = decodeURIComponent(url.pathname).split("/").filter(Boolean);
    const platform = link.platform.trim() || host.split(".")[0];
    const label = socialNames[platform.toLowerCase()] || platform.slice(0, 14);
    const explicitHandle = path.find((part) => part.startsWith("@"));
    const handleHost = /(^|\.)(instagram|tiktok|twitter|x|soundcloud)\.com$/.test(host);
    const handle = explicitHandle || (handleHost ? path[0] : undefined);
    return `${label} · ${handle ? (handle.startsWith("@") ? handle : `@${handle}`) : host + (path.length ? `/${path.join("/")}` : "")}`;
  } catch {
    return link.platform.trim();
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image: ${src}`));
    image.src = src;
  });
}

function cover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  ctx.drawImage(image, (image.naturalWidth - sourceWidth) / 2, (image.naturalHeight - sourceHeight) / 2,
    sourceWidth, sourceHeight, 0, 0, width, height);
}

function fitText(ctx: CanvasRenderingContext2D, value: string, maxWidth: number, startSize: number, minSize: number) {
  for (let size = startSize; size >= minSize; size -= 2) {
    ctx.font = `600 ${size}px Arial, sans-serif`;
    if (ctx.measureText(value).width <= maxWidth) return size;
  }
  return minSize;
}

function wrapLines(ctx: CanvasRenderingContext2D, value: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of value.trim().split(/\s+/)) {
    const next = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(next).width > maxWidth) {
      lines.push(current);
      current = word;
    } else current = next;
  }
  if (current) lines.push(current);
  return lines;
}

function drawStageName(ctx: CanvasRenderingContext2D, name: string, width: number, headerHeight: number, australian: boolean) {
  const title = name.trim().toLocaleUpperCase("es-AR") || "MÚSICA EN VIVO";
  let size = width === A6.width ? 100 : 126;
  let lines: string[] = [];
  while (size >= 48) {
    ctx.font = `700 ${size}px Arial, sans-serif`;
    lines = wrapLines(ctx, title, width - 160);
    if (lines.length <= 3) break;
    size -= 4;
  }
  const lineHeight = size * 1.02;
  const subtitleY = headerHeight - 80;
  const firstY = subtitleY - 58 - (lines.length - 1) * lineHeight;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.font = `700 ${size}px Arial, sans-serif`;
  lines.forEach((line, index) => ctx.fillText(line, 82, firstY + index * lineHeight, width - 164));
  ctx.font = `600 ${width === A6.width ? 28 : 35}px Arial, sans-serif`;
  ctx.fillText(australian ? "L I V E   M U S I C" : "M Ú S I C A   E N   V I V O", 84, subtitleY);
}

function drawContacts(ctx: CanvasRenderingContext2D, profile: PublicProfile, wide: boolean) {
  const links = profile.socialLinks.map(socialHandle).filter(Boolean);
  const width = ctx.canvas.width;
  const lineY = wide ? 2050 : 1580;
  ctx.strokeStyle = "#dedede";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(85, lineY);
  ctx.lineTo(width - 85, lineY);
  ctx.stroke();
  const colWidth = (width - 205) / 2;
  const fontSize = wide ? 36 : links.length > 2 ? 27 : 32;
  const rowHeight = wide ? 55 : 42;
  const rows = Math.ceil(links.length / 2);
  links.forEach((link, index) => {
    const row = Math.floor(index / 2);
    const x = index % 2 === 0 ? 87 : width / 2 + 18;
    const size = fitText(ctx, link, colWidth, fontSize, wide ? 27 : 22);
    ctx.font = `600 ${size}px Arial, sans-serif`;
    ctx.fillStyle = "#252525";
    ctx.textAlign = "left";
    ctx.fillText(link, x, lineY + (wide ? 65 : 50) + row * rowHeight, colWidth);
  });
  if (profile.publicEmail.trim()) {
    const emailY = wide ? 2440 : 1720;
    const emailSize = fitText(ctx, profile.publicEmail.trim(), width - 175, wide ? 33 : 29, wide ? 25 : 21);
    ctx.font = `400 ${emailSize}px Arial, sans-serif`;
    ctx.fillStyle = "#555";
    ctx.textAlign = "left";
    ctx.fillText(profile.publicEmail.trim(), 87, Math.max(emailY, lineY + 65 + rows * rowHeight), width - 175);
  }
}

/** A show-independent print card. The URL is the exact value used by the dialog QR. */
export async function renderQrPrintCard(profile: PublicProfile, url: string): Promise<PrintCard> {
  const australian = profile.market === "AU";
  const wide = profile.socialLinks.filter((link) => socialHandle(link)).length > 4;
  const size = wide ? A5 : A6;
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");
  await document.fonts.ready;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size.width, size.height);
  const headerHeight = wide ? 670 : 635;
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, size.width, headerHeight);
  if (profile.bannerUrl) {
    try {
      const banner = await loadImage(new URL(publicMediaUrl(profile.bannerUrl, profile.version), location.origin).href);
      cover(ctx, banner, size.width, headerHeight);
    } catch {
      // A neutral header keeps the QR printable when an older banner is unavailable.
    }
  }
  const shade = ctx.createLinearGradient(0, 0, 0, headerHeight);
  shade.addColorStop(0, "rgba(0,0,0,.47)");
  shade.addColorStop(.5, "rgba(0,0,0,.26)");
  shade.addColorStop(1, "rgba(0,0,0,.9)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, size.width, headerHeight);
  try {
    const logo = await loadImage("/brand/icon-512.png");
    ctx.drawImage(logo, 82, 62, 88, 88);
  } catch { /* Branding text remains visible if the icon cannot load. */ }
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.font = "700 43px Arial, sans-serif";
  ctx.fillText(australian ? "music" : "musica", 186, 107);
  ctx.font = "400 27px Arial, sans-serif";
  ctx.fillText(australian ? "m e n u" : "a  l a  c a r t a", 188, 145);
  drawStageName(ctx, profile.stageName, size.width, headerHeight, australian);

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.roundRect(0, headerHeight - 32, size.width, size.height - headerHeight + 32, [40, 40, 0, 0]);
  ctx.fill();
  ctx.fillStyle = "#090909";
  ctx.textAlign = "center";
  ctx.font = `700 ${wide ? 65 : 53}px Arial, sans-serif`;
  ctx.fillText(australian ? "Choose the next song" : "Elegí la próxima canción", size.width / 2, wide ? 770 : 707, size.width - 140);
  ctx.fillStyle = "#5e5e5e";
  ctx.font = `400 ${wide ? 35 : 29}px Arial, sans-serif`;
  ctx.fillText(australian ? "Scan to see the live menu" : "Escaneá y mirá la carta en vivo", size.width / 2, wide ? 825 : 755);

  const qrSize = wide ? 850 : 630;
  const qrX = (size.width - qrSize) / 2;
  const qrY = wide ? 930 : 815;
  const qr = await QRCode.toDataURL(url, {
    width: qrSize, margin: 4, errorCorrectionLevel: "H",
    color: { dark: "#000000", light: "#ffffff" },
  });
  ctx.strokeStyle = "#dedede";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(qrX - 44, qrY - 42, qrSize + 88, qrSize + 88, 35);
  ctx.stroke();
  ctx.drawImage(await loadImage(qr), qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = "#111";
  ctx.font = `700 ${wide ? 42 : 33}px Arial, sans-serif`;
  ctx.fillText(australian ? "One QR for every show" : "Un mismo QR para todos los shows", size.width / 2, wide ? 1990 : 1544, size.width - 170);
  drawContacts(ctx, profile, wide);
  return { canvas, pageWidth: size.pageWidth, pageHeight: size.pageHeight };
}

export async function downloadQrPrintCard(profile: PublicProfile, url: string): Promise<void> {
  const { canvas, pageWidth, pageHeight } = await renderQrPrintCard(profile, url);
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const image = await pdf.embedPng(canvas.toDataURL("image/png"));
  pdf.addPage([pageWidth, pageHeight]).drawImage(image, { x: 0, y: 0, width: pageWidth, height: pageHeight });
  const bytes = await pdf.save();
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `${profile.market === "AU" ? "music-menu" : "musica-a-la-carta"}-${profile.slug}-table-qr.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
