import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { Shell, SkipLink } from "@/components/shell";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Musica a la carta · Tu noche, tu música",
    template: "%s · Musica a la carta",
  },
  description:
    "Elegí una canción, dedicá un momento y disfrutá la música en vivo.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR" suppressHydrationWarning>
      <body>
        <Providers>
          <SkipLink />
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
