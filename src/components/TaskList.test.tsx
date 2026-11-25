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
  fetchNextPage: vi.fn(),
  isFetchingNextPage: false,
  extraPages: [] as Array<{
    items: Array<{
      id: string;
      titulo: string;
      descricao?: string;
      dataCriacao: number;
    }>;
    nextCursor: string | null;
  }>,
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
        infiniteQueryOptions: () => ({}),
        infiniteQueryFilter: () => ({}),
      },
      delete: {
        mutationOptions: (options: typeof harness.mutationOptions) => options,
      },
    },
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useInfiniteQuery: () => {
    const pages = [harness.queryData, ...harness.extraPages];
    return {
      data: { pages, pageParams: [null] },
      hasNextPage: Boolean(pages[pages.length - 1]?.nextCursor),
      isFetchingNextPage: harness.isFetchingNextPage,
      fetchNextPage: harness.fetchNextPage,
    };
  },
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
  harness.extraPages = [];
  harness.isFetchingNextPage = false;
  harness.mutationOptions = {};
  harness.mutationState = { isPending: false, variables: undefined };
  harness.mutate.mockReset();
  harness.fetchNextPage.mockReset();
  harness.invalidateQueries.mockClear();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        intersection = callback;
      }
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
    },
  );
});

let intersection: IntersectionObserverCallback = () => {};

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
    expect(screen.queryByText("Carregando…")).not.toBeInTheDocument();
  });

  it("shows tasks from the next page and asks for another when the sentinel is visible", () => {
    harness.queryData = { ...page, nextCursor: "b" };
    harness.extraPages = [
      {
        items: [
          {
            id: "c",
            titulo: "Segunda página",
            dataCriacao: Date.UTC(2026, 10, 25, 10, 0),
          },
        ],
        nextCursor: null,
      },
    ];
    render(<TaskList initialPage={page} />);

    expect(screen.getByRole("heading", { name: "Segunda página" })).toBeInTheDocument();
    expect(screen.queryByText("Carregando…")).not.toBeInTheDocument();
  });

  it("shows a loading line and requests the next page while more tasks remain", () => {
    harness.queryData = { ...page, nextCursor: "b" };
    harness.isFetchingNextPage = true;
    render(<TaskList initialPage={page} />);

    expect(screen.getByText("Carregando…")).toBeInTheDocument();

    harness.isFetchingNextPage = false;
    render(<TaskList initialPage={{ ...page, nextCursor: "b" }} />);
    act(() => {
      intersection([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    expect(harness.fetchNextPage).toHaveBeenCalled();
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
