import { PortalGuard } from "@/components/shell";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <PortalGuard>{children}</PortalGuard>;
}
