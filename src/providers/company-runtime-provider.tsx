"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";

export const CompanyRuntimeProvider = ({ children }: { children: ReactNode }) => {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 20_000, retry: false, refetchOnWindowFocus: true },
          mutations: { retry: false },
        },
      }),
  );

  useEffect(
    () => () => {
      void client.cancelQueries();
      client.clear();
    },
    [client],
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};
