"use client";
import { Suspense, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth-context";
import { LocaleProvider } from "@/lib/i18n";
import { ToastProvider } from "./toast-provider";
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10000,
            retry: 1,
            refetchOnWindowFocus: true,
            refetchIntervalInBackground: false,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <AuthProvider><LocaleProvider><ToastProvider><Suspense fallback={<div className="min-h-dvh bg-background" aria-busy="true" />}>{children}</Suspense></ToastProvider></LocaleProvider></AuthProvider>
    </QueryClientProvider>
  );
}
