"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";

export function HttpTaskCount() {
  const trpc = useTRPC();
  const list = useQuery(trpc.task.list.queryOptions());

  if (list.isLoading) {
    return <p>Carregando…</p>;
  }

  if (list.error) {
    return <p>{list.error.message}</p>;
  }

  return <p>{list.data?.items.length ?? 0} via HTTP</p>;
}
