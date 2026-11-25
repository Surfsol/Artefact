import { createElement, type ReactNode } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskList } from "./TaskList";

const harness = vi.hoisted(() => ({
  queryData: {
    items: [] as Array<{
      id: string;
      titulo: string;
      descricao?: string;
      dataCriacao: number;
    }>,
    nextCursor: null as string | null,
  },
  mutationOptions: {} as {
    onSuccess?: () => Promise<void> | void;
    onError?: (error: { message: string }) => void;
  },
  mutationState: {
    isPending: false,
    variables: undefined as { id: string } | undefined,
  },
  mutate: vi.fn(),
  invalidateQueries: vi.fn(async () => {}),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) =>
    createElement("a", { href }, children),
}));

vi.mock("@/lib/trpc/client", () => ({
  useTRPC: () => ({
    task: {
      list: {
        queryOptions: () => ({}),
        queryFilter: () => ({}),
      },
      delete: {
        mutationOptions: (options: typeof harness.mutationOptions) => options,
      },
    },
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: harness.queryData }),
  useQueryClient: () => ({ invalidateQueries: harness.invalidateQueries }),
  useMutation: (options: typeof harness.mutationOptions) => {
    harness.mutationOptions = options;
    return {
      mutate: harness.mutate,
      isPending: harness.mutationState.isPending,
      variables: harness.mutationState.variables,
    };
  },
}));

const page = {
  items: [
    {
      id: "a",
      titulo: "Comprar pão",
      descricao: "Na padaria",
      dataCriacao: Date.UTC(2026, 10, 25, 12, 0),
    },
    {
      id: "b",
      titulo: "Sem descrição",
      dataCriacao: Date.UTC(2026, 10, 25, 11, 0),
    },
  ],
  nextCursor: null,
};

beforeEach(() => {
  harness.queryData = page;
  harness.mutationOptions = {};
  harness.mutationState = { isPending: false, variables: undefined };
  harness.mutate.mockReset();
  harness.invalidateQueries.mockClear();
});

describe("TaskList", () => {
  it("renders titles, a description when present, and the creation time", () => {
    render(<TaskList initialPage={page} />);

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByRole("heading", { name: "Comprar pão" })).toBeInTheDocument();
    expect(within(rows[0]).getByText("Na padaria")).toBeInTheDocument();
    expect(within(rows[0]).getByText(/Criada em/)).toBeInTheDocument();
    expect(within(rows[1]).getByRole("heading", { name: "Sem descrição" })).toBeInTheDocument();
    expect(within(rows[1]).queryByText("Na padaria")).not.toBeInTheDocument();
    expect(within(rows[1]).getByText(/Criada em/)).toBeInTheDocument();
  });

  it("deletes the clicked task and shows its title", async () => {
    render(<TaskList initialPage={page} />);

    fireEvent.click(within(screen.getAllByRole("listitem")[0]).getByRole("button", { name: "Excluir" }));

    expect(harness.mutate).toHaveBeenCalledWith({ id: "a" });
    await act(async () => {
      await harness.mutationOptions.onSuccess?.();
    });

    expect(screen.getByRole("status")).toHaveTextContent("Tarefa “Comprar pão” excluída.");
  });

  it("disables the button while that task is being deleted", () => {
    harness.mutationState = { isPending: true, variables: { id: "a" } };
    render(<TaskList initialPage={page} />);

    const pending = screen.getByRole("button", { name: "Excluindo…" });
    const idle = screen.getByRole("button", { name: "Excluir" });
    expect(pending).toBeDisabled();
    expect(idle).toBeEnabled();
  });

  it("shows the error message when delete fails", () => {
    render(<TaskList initialPage={page} />);

    act(() => {
      harness.mutationOptions.onError?.({ message: "Tarefa não encontrada" });
    });

    expect(screen.getByRole("status")).toHaveTextContent("Tarefa não encontrada");
  });
});
