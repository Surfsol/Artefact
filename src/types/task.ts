export type Task = {
  id: string;
  titulo: string;
  descricao?: string;
  dataCriacao: number;
};

export type TaskPage = {
  items: Task[];
  nextCursor: string | null;
};

export type FormTask = Pick<Task, "id" | "titulo" | "descricao">;
