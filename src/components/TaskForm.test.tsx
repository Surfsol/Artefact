import type { ReactNode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditTaskForm } from "./EditTaskForm";
import { TaskForm } from "./TaskForm";

const harness = vi.hoisted(() => ({
  call: 0,
  isPending: false,
  queries: [] as Array<
    [
      unknown,
      { items: Array<{ id: string; titulo: string; descricao?: string; dataCriacao: number }> } | undefined,
    ]
  >,
  createOptions: {} as {
    onSuccess?: () => Promise<void> | void;
    onError?: (error: { message: string }) => void;
  },
  updateOptions: {} as {
    onSuccess?: () => Promise<void> | void;
    onError?: (error: { message: string }) => void;
  },
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
  invalidateQueries: vi.fn(async () => {}),
  push: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: harness.push }),
}));

vi.mock("@/lib/trpc/client", () => ({
  useTRPC: () => ({
    task: {
      list: {
        queryFilter: () => ({}),
        infiniteQueryFilter: () => ({}),
      },
      create: {
        mutationOptions: (options: typeof harness.createOptions) => options,
      },
      update: {
        mutationOptions: (options: typeof harness.updateOptions) => options,
      },
    },
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    getQueriesData: () => harness.queries,
    invalidateQueries: harness.invalidateQueries,
  }),
  useMutation: (options: typeof harness.createOptions) => {
    const isCreate = harness.call % 2 === 0;
    harness.call += 1;
    if (isCreate) {
      harness.createOptions = options;
      return { mutate: harness.createMutate, isPending: harness.isPending };
    }
    harness.updateOptions = options;
    return { mutate: harness.updateMutate, isPending: harness.isPending };
  },
}));

const cachedTask = {
  id: "a",
  titulo: "Comprar pão",
  descricao: "Na padaria",
  dataCriacao: Date.UTC(2026, 10, 25, 12, 0),
};

beforeEach(() => {
  harness.call = 0;
  harness.isPending = false;
  harness.queries = [];
  harness.createOptions = {};
  harness.updateOptions = {};
  harness.createMutate.mockReset();
  harness.updateMutate.mockReset();
  harness.invalidateQueries.mockClear();
  harness.push.mockReset();
});

describe("TaskForm", () => {
  it("blocks an empty title before calling the server", () => {
    render(<TaskForm />);

    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(screen.getByRole("status")).toHaveTextContent("O título é obrigatório.");
    expect(harness.createMutate).not.toHaveBeenCalled();
    expect(harness.updateMutate).not.toHaveBeenCalled();
  });

  it("creates a task with a trimmed title and no blank description", async () => {
    render(<TaskForm />);

    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "  Comprar leite  " } });
    fireEvent.change(screen.getByLabelText("Descrição"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(harness.createMutate).toHaveBeenCalledWith({
      titulo: "Comprar leite",
      descricao: undefined,
    });
    await act(async () => {
      await harness.createOptions.onSuccess?.();
    });
    expect(harness.invalidateQueries).toHaveBeenCalled();
    expect(harness.push).toHaveBeenCalledWith("/");
  });

  it("shows the server error and disables the button while saving", () => {
    harness.isPending = true;
    render(<TaskForm />);

    const button = screen.getByRole("button", { name: "Salvando…" });
    expect(button).toBeDisabled();

    act(() => {
      harness.createOptions.onError?.({ message: "O título é obrigatório." });
    });
    expect(screen.getByRole("status")).toHaveTextContent("O título é obrigatório.");
  });

  it("updates the task already open on the list", async () => {
    render(<TaskForm task={cachedTask} />);

    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Comprar café" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(harness.updateMutate).toHaveBeenCalledWith({
      id: "a",
      titulo: "Comprar café",
      descricao: "Na padaria",
    });
    expect(harness.createMutate).not.toHaveBeenCalled();
  });
});

describe("EditTaskForm", () => {
  it("shows the not-found message when the list has no such task", async () => {
    render(<EditTaskForm id="missing" />);

    expect(await screen.findByText("Tarefa não encontrada")).toBeInTheDocument();
    expect(screen.queryByLabelText("Título")).not.toBeInTheDocument();
  });

  it("fills the form from the task already on the list", async () => {
    harness.queries = [[null, { items: [cachedTask] }]];
    render(<EditTaskForm id="a" />);

    expect(await screen.findByLabelText("Título")).toHaveValue("Comprar pão");
    expect(screen.getByLabelText("Descrição")).toHaveValue("Na padaria");
  });
});
