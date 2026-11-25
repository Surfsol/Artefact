"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { TaskPage } from "@/types";
import { useTRPC } from "@/lib/trpc/client";

const SUCCESS_BANNER_MS = 4000;

// UTC keeps the server HTML and the hydrated client on the same clock.
const createdAtFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "UTC",
});

export function TaskList({ initialPage }: { initialPage: TaskPage }) {
  const [banner, setBanner] = useState<{ kind: "success" | "error"; message: string } | null>(
    null,
  );
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deletedTitle = useRef<string | null>(null);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const list = useInfiniteQuery(
    trpc.task.list.infiniteQueryOptions(
      { limit: 10 },
      {
        // null is the first page. The next call starts after nextCursor.
        initialCursor: null,
        initialData: {
          pages: [initialPage],
          pageParams: [null],
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      },
    ),
  );
  const hasNextPage = list.hasNextPage;
  const isFetchingNextPage = list.isFetchingNextPage;
  const fetchNextPage = list.fetchNextPage;
  const pageCount = list.data?.pages.length ?? 0;
  const sentinel = useRef<HTMLDivElement>(null);

  // The sentinel asks for the next page of 10 when it scrolls into view.
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && !isFetchingNextPage) {
        void fetchNextPage();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, pageCount]);

  useEffect(() => {
    return () => {
      if (bannerTimer.current) {
        clearTimeout(bannerTimer.current);
      }
    };
  }, []);

  function showDeleted(titulo: string) {
    if (bannerTimer.current) {
      clearTimeout(bannerTimer.current);
    }
    setBanner({ kind: "success", message: `Tarefa “${titulo}” excluída.` });
    bannerTimer.current = setTimeout(() => {
      setBanner(null);
      bannerTimer.current = null;
    }, SUCCESS_BANNER_MS);
  }

  const deleteTask = useMutation(
    trpc.task.delete.mutationOptions({
      onSuccess: async () => {
        const titulo = deletedTitle.current;
        if (titulo) {
          showDeleted(titulo);
        }
        await queryClient.invalidateQueries(trpc.task.list.infiniteQueryFilter());
      },
      onError: (error) => {
        if (bannerTimer.current) {
          clearTimeout(bannerTimer.current);
          bannerTimer.current = null;
        }
        setBanner({ kind: "error", message: error.message });
      },
    }),
  );

  const items = list.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <>
      {banner ? (
        <p
          className={banner.kind === "error" ? "banner banner-error" : "banner banner-success"}
          role="status"
        >
          {banner.message}
        </p>
      ) : null}
      {items.length === 0 ? (
        <p>Nenhuma tarefa.</p>
      ) : (
        <ul className="task-list">
          {items.map((task) => {
            const pending = deleteTask.isPending && deleteTask.variables?.id === task.id;

            return (
              <li className="task" key={task.id}>
                <h2>{task.titulo}</h2>
                {task.descricao ? <p>{task.descricao}</p> : null}
                <p>Criada em {createdAtFormat.format(task.dataCriacao)}</p>
                <div className="task-actions">
                  <Link href={`/task/${task.id}`}>Editar</Link>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      deletedTitle.current = task.titulo;
                      deleteTask.mutate({ id: task.id });
                    }}
                  >
                    {pending ? "Excluindo…" : "Excluir"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {hasNextPage ? <div className="task-sentinel" ref={sentinel} /> : null}
      {isFetchingNextPage ? <p>Carregando…</p> : null}
    </>
  );
}
