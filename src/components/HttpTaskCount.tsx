"use client";

import { trpc } from "@/lib/trpc/client";

export function HttpTaskCount() {
  const list = trpc.task.list.useQuery();

  if (list.isLoading) {
    return <p>Carregando…</p>;
  }

  if (list.error) {
    return <p>{list.error.message}</p>;
  }

  return <p>{list.data?.items.length ?? 0} via HTTP</p>;
}
