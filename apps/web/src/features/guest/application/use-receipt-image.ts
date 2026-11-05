"use client";
import { useEffect, useState } from "react";
import { privateImage, type Role } from "@/lib/api";
export function useReceiptImage(url: string, role: Role) {
  const [src, setSrc] = useState("");
  const [error, setError] = useState<unknown>();
  useEffect(() => {
    let current = "";
    let alive = true;
    setSrc("");
    setError(undefined);
    privateImage(url, role)
      .then((value) => {
        current = value;
        if (alive) setSrc(value);
        else URL.revokeObjectURL(value);
      })
      .catch((error) => {
        if (alive) setError(error);
      });
    return () => {
      alive = false;
      if (current) URL.revokeObjectURL(current);
    };
  }, [url, role]);
  return { src, error };
}
