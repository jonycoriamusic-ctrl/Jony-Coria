"use client";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateRequestInput, MusicRequest } from "@musica/contracts";
import { useMusicianSlug, guestHref } from "@/lib/navigation";
import { api, json } from "@/lib/api";
import { useToast } from "@/components/toast-provider";
import { errorMessageKey } from "@/lib/error-messages";
export function useReservation(input: CreateRequestInput) {
  const router = useRouter();
  const slug = useMusicianSlug();
  const client = useQueryClient();
  const toast = useToast();
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
      toast.success(request.type === "dedication" ? "Your dedication is reserved. Transfer to join the queue." : "Your song is reserved. Transfer to join the queue.");
      router.push(guestHref(`/pedidos/${request.id}`, slug));
    },
    onError: error => toast.error(errorMessageKey(error)),
  });
}
