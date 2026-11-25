"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type SubmitEvent } from "react";
import type { FormTask } from "@/types";
import { useTRPC } from "@/lib/trpc/client";

const TITLE_REQUIRED = "O título é obrigatório.";

export function TaskForm({ task }: { task?: FormTask }) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [titulo, setTitulo] = useState(task?.titulo ?? "");
  const [descricao, setDescricao] = useState(task?.descricao ?? "");
  const [error, setError] = useState<string | null>(null);

  async function returnHome() {
    await queryClient.invalidateQueries({
      ...trpc.task.list.infiniteQueryFilter(),
      refetchType: "all",
    });
    router.push("/");
  }

  const createTask = useMutation(
    trpc.task.create.mutationOptions({
      onSuccess: returnHome,
      onError: (mutationError) => setError(mutationError.message),
    }),
  );
  const updateTask = useMutation(
    trpc.task.update.mutationOptions({
      onSuccess: returnHome,
      onError: (mutationError) => setError(mutationError.message),
    }),
  );
  const pending = createTask.isPending || updateTask.isPending;

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }

    const nextTitulo = titulo.trim();
    if (!nextTitulo) {
      setError(TITLE_REQUIRED);
      return;
    }

    setError(null);
    const input = {
      titulo: nextTitulo,
      descricao: descricao.trim() || undefined,
    };

    if (task) {
      updateTask.mutate({ id: task.id, ...input });
      return;
    }

    createTask.mutate(input);
  }

  return (
    <form className="task-form" noValidate onSubmit={onSubmit}>
      {error ? (
        <p className="banner banner-error" role="status">
          {error}
        </p>
      ) : null}
      <label>
        Título
        <input value={titulo} onChange={(event) => setTitulo(event.target.value)} />
      </label>
      <label>
        Descrição
        <textarea value={descricao} onChange={(event) => setDescricao(event.target.value)} />
      </label>
      <div className="form-actions">
        <button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </button>
        <Link href="/">Cancelar</Link>
      </div>
    </form>
  );
}
