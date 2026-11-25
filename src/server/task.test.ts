import { beforeEach, describe, expect, it } from "vitest";
import { createCaller } from "./router";
import { resetTasks, seedTasks } from "./store";

const caller = () => createCaller({});

beforeEach(() => {
  resetTasks();
});

describe("task.create", () => {
  // Requirement: create a task with id, titulo, optional descricao, and dataCriacao.
  it("trims the title and stores the description and creation time", async () => {
    const created = await caller().task.create({
      titulo: "  Comprar pão  ",
      descricao: "Na padaria",
    });

    expect(created.id).toEqual(expect.any(String));
    expect(created.titulo).toBe("Comprar pão");
    expect(created.descricao).toBe("Na padaria");
    expect(created.dataCriacao).toEqual(expect.any(Number));
  });

  // Requirement: descricao is optional.
  it("allows a missing description", async () => {
    const created = await caller().task.create({ titulo: "Sem descrição" });

    expect(created.descricao ?? "").toBe("");
  });

  // Requirement: a task cannot be created without a title.
  it.each(["", "   "])("rejects a blank title %j", async (titulo) => {
    await expect(caller().task.create({ titulo })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "O título é obrigatório.",
    });
  });

  // Zod rejects a title that is not a string, before a task is stored.
  it("rejects a non-string title", async () => {
    await expect(
      caller().task.create({ titulo: 12 as never }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const page = await caller().task.list();
    expect(page.items).toHaveLength(0);
  });
});

describe("task.list", () => {
  // Tasks are sorted and displayed in descending order based on creation date.
  it("returns the newest task first", async () => {
    const first = await caller().task.create({ titulo: "Primeira" });
    const second = await caller().task.create({ titulo: "Segunda" });

    const page = await caller().task.list();

    expect(page.items.map((task) => task.id)).toEqual([second.id, first.id]);
  });

  // Bonus: infinite scroll. The first page has 10 tasks and a cursor when more remain.
  it("returns 10 tasks and a cursor when more exist", async () => {
    for (let index = 0; index < 11; index += 1) {
      await caller().task.create({ titulo: `Tarefa ${index}` });
    }

    const page = await caller().task.list();

    expect(page.items).toHaveLength(10);
    expect(page.nextCursor).toEqual(expect.any(String));
  });

  // Bonus: the next page continues from the cursor and does not repeat tasks.
  it("returns the rest of the tasks from the cursor without duplicates", async () => {
    for (let index = 0; index < 11; index += 1) {
      await caller().task.create({ titulo: `Tarefa ${index}` });
    }

    const first = await caller().task.list();
    const second = await caller().task.list({ cursor: first.nextCursor });
    const ids = [...first.items, ...second.items].map((task) => task.id);

    expect(second.items).toHaveLength(1);
    expect(second.nextCursor ?? null).toBeNull();
    expect(new Set(ids).size).toBe(ids.length);
  });

  // Bonus: paging reaches every task and stops on the last short page.
  it("pages through 25 seeded tasks and ends on a short page", async () => {
    seedTasks(25);

    const ids: string[] = [];
    const titles: string[] = [];
    let cursor: string | undefined;
    let lastPageSize = 0;

    do {
      const page = await caller().task.list({ cursor, limit: 10 });
      lastPageSize = page.items.length;
      ids.push(...page.items.map((task) => task.id));
      titles.push(...page.items.map((task) => task.titulo));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);

    expect(ids).toHaveLength(25);
    expect(new Set(ids).size).toBe(25);
    expect(lastPageSize).toBe(5);
    expect(titles[0]).toBe("Tarefa 25");
    expect(titles[9]).toBe("Tarefa 16");
    expect(titles.at(-1)).toBe("Tarefa 1");
  });
});

describe("task.update", () => {
  // Requirement: update an existing task. id and dataCriacao stay the same.
  it("changes the title and description and keeps the id and creation time", async () => {
    const created = await caller().task.create({
      titulo: "Original",
      descricao: "Antes",
    });

    const updated = await caller().task.update({
      id: created.id,
      titulo: "Novo",
      descricao: "Depois",
    });

    expect(updated).toMatchObject({
      id: created.id,
      titulo: "Novo",
      descricao: "Depois",
      dataCriacao: created.dataCriacao,
    });
  });

  // Requirement: a title is still required on update, and a rejected update leaves the task unchanged.
  it("rejects a blank title and leaves the task unchanged", async () => {
    const created = await caller().task.create({ titulo: "Original" });

    await expect(
      caller().task.update({ id: created.id, titulo: "   " }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "O título é obrigatório.",
    });

    const page = await caller().task.list();
    expect(page.items.find((task) => task.id === created.id)).toMatchObject({
      titulo: "Original",
    });
  });

  // Requirement: updating a task that does not exist returns a clear error.
  it("rejects an unknown id", async () => {
    await expect(
      caller().task.update({ id: "ausente", titulo: "Novo" }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Tarefa não encontrada",
    });
  });
});

describe("task.delete", () => {
  // Requirement: delete a task and remove it from the list.
  it("removes the task from the list", async () => {
    const created = await caller().task.create({ titulo: "Apagar" });

    await caller().task.delete({ id: created.id });

    const page = await caller().task.list();
    expect(page.items.map((task) => task.id)).not.toContain(created.id);
  });

  // Requirement: deleting a task that does not exist returns a clear error.
  it("rejects an unknown id", async () => {
    await expect(caller().task.delete({ id: "ausente" })).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Tarefa não encontrada",
    });
  });
});
