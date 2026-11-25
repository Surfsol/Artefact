import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { insertTask, listTasks, removeTask, updateTask } from "./store";

const t = initTRPC.create();

const TITLE_REQUIRED = "O título é obrigatório.";
const NOT_FOUND = "Tarefa não encontrada";

const taskInput = z.object({
  titulo: z.string(),
  descricao: z.string().optional(),
});

function requiredTitle(titulo: string): string {
  const trimmed = titulo.trim();
  if (!trimmed) {
    throw new TRPCError({ code: "BAD_REQUEST", message: TITLE_REQUIRED });
  }
  return trimmed;
}

function missingTask(): never {
  throw new TRPCError({ code: "NOT_FOUND", message: NOT_FOUND });
}

const taskRouter = t.router({
  create: t.procedure.input(taskInput).mutation(({ input }) => {
    const titulo = requiredTitle(input.titulo);
    return insertTask({ titulo, descricao: input.descricao });
  }),

  // Pages of 10 let the list load further tasks as the user scrolls.
  list: t.procedure
    .input(
      z
        .object({
          cursor: z.string().nullish(),
          limit: z.number().int().positive().optional(),
        })
        .optional(),
    )
    .query(({ input }) => {
      const limit = input?.limit ?? 10;
      const ordered = listTasks();
      const start = input?.cursor
        ? ordered.findIndex((task) => task.id === input.cursor) + 1
        : 0;
      const items = ordered.slice(start, start + limit);
      const nextIndex = start + items.length;
      const nextCursor = nextIndex < ordered.length ? ordered[nextIndex - 1]?.id ?? null : null;

      return { items, nextCursor };
    }),

  update: t.procedure
    .input(taskInput.extend({ id: z.string() }))
    .mutation(({ input }) => {
      const titulo = requiredTitle(input.titulo);
      return updateTask(input.id, { titulo, descricao: input.descricao }) ?? missingTask();
    }),

  delete: t.procedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      if (!removeTask(input.id)) {
        missingTask();
      }
    }),
});

export const appRouter = t.router({
  task: taskRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = t.createCallerFactory(appRouter);
