"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormTask, TaskPage } from "@/types";
import { useTRPC } from "@/lib/trpc/client";
import { TaskForm } from "./TaskForm";

// The open list already has this task. A direct visit has no list, so there is nothing to edit.
export function EditTaskForm({ id }: { id: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [task, setTask] = useState<FormTask | null | undefined>(undefined);

  useEffect(() => {
    const pages = queryClient.getQueriesData<TaskPage>(trpc.task.list.queryFilter());
    const found = pages.flatMap(([, data]) => data?.items ?? []).find((item) => item.id === id);
    setTask(found ?? null);
  }, [id, queryClient, trpc]);

  if (task === undefined) {
    return null;
  }

  if (task === null) {
    return (
      <>
        <p>Tarefa não encontrada</p>
        <p>
          <Link href="/">Voltar</Link>
        </p>
      </>
    );
  }

  return <TaskForm task={task} />;
}
