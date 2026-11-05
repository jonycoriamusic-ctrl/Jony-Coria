"use client";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateRequestInput, MusicRequest } from "@musica/contracts";
import { useMusicianSlug, guestHref } from "@/lib/navigation";
import { api, json } from "@/lib/api";
export function useReservation(input: CreateRequestInput) {
  const router = useRouter();
  const slug = useMusicianSlug();
  const client = useQueryClient();
  const operation = useRef({ body: "", key: "" });
  return useMutation({
    mutationFn: () => {
      const body = json(input);
      if (operation.current.body !== body)
        operation.current = { body, key: crypto.randomUUID() };
      return api<MusicRequest>("/requests", {
        role: "guest",
        method: "POST",
        body,
        headers: { "Idempotency-Key": operation.current.key },
      });
    },
    onSuccess: (request) => {
      client.invalidateQueries();
      router.push(guestHref(`/pedidos/${request.id}`, slug));
    },
  });
}
