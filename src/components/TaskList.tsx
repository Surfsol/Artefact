"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  const list = useQuery(trpc.task.list.queryOptions({ limit: 10 }, { initialData: initialPage }));

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
        await queryClient.invalidateQueries(trpc.task.list.queryFilter());
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

  const items = list.data?.items ?? [];

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
    </>
  );
}
