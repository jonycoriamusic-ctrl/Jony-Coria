import { MenuView } from "@/features/guest/menu";
export default async function Page({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params;
  return <MenuView slug={slug} />;
}
