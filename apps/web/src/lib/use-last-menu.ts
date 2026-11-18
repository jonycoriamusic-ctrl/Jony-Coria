"use client";

import { useEffect, useState } from "react";
import { readLastMenu } from "./last-menu";

export function useLastMenu() {
  const [lastMenu, setLastMenu] = useState<ReturnType<typeof readLastMenu>>(null);
  useEffect(() => {
    const refresh = () => setLastMenu(readLastMenu());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("musica:last-menu", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("musica:last-menu", refresh);
    };
  }, []);
  return lastMenu;
}
