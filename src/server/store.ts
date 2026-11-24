export type Task = {
  id: string;
  titulo: string;
  descricao?: string;
  dataCriacao: number;
};

// seq is only used in the store. It orders tasts created within same millisecond. 
type StoredTask = Task & { seq: number };

const globalStore = globalThis as typeof globalThis & {
  __artefactTasks?: StoredTask[];
  __artefactTaskSeq?: number;
};

// Next can load this module twice. The global keeps one list for the page and the API route.
function tasks(): StoredTask[] {
  globalStore.__artefactTasks ??= [];
  return globalStore.__artefactTasks;
}

// to assign a sequence number
function nextSeq(): number {
  globalStore.__artefactTaskSeq = (globalStore.__artefactTaskSeq ?? 0) + 1;
  return globalStore.__artefactTaskSeq;
}

// only used for testing
export function resetTasks() {
  globalStore.__artefactTasks = [];
  globalStore.__artefactTaskSeq = 0;
}

export function seedTasks(count: number) {
  resetTasks();
  const now = Date.now();

  for (let index = 0; index < count; index += 1) {
    tasks().push({
      id: crypto.randomUUID(),
      titulo: `Tarefa ${index + 1}`,
      descricao: "",
      dataCriacao: now - index,
      seq: nextSeq(),
    });
  }
}

// Descending order by dataCriacao, or by seq when dataCriacao a and b are the same.
export function listTasks(): Task[] {
  return tasks()
    .slice()
    .sort((a, b) => b.dataCriacao - a.dataCriacao || b.seq - a.seq)
    .map(({ seq: _seq, ...task }) => task);
}

export function insertTask(input: { titulo: string; descricao?: string }): Task {
  const task: StoredTask = {
    id: crypto.randomUUID(),
    titulo: input.titulo,
    descricao: input.descricao,
    dataCriacao: Date.now(),
    seq: nextSeq(),
  };
  tasks().push(task);
  const { seq: _seq, ...publicTask } = task;
  return publicTask;
}

export function updateTask(
  id: string,
  input: { titulo: string; descricao?: string },
): Task | undefined {
  const task = tasks().find((item) => item.id === id);
  if (!task) {
    return undefined;
  }

  task.titulo = input.titulo;
  task.descricao = input.descricao;
  const { seq: _seq, ...publicTask } = task;
  return publicTask;
}

export function removeTask(id: string): boolean {
  const index = tasks().findIndex((item) => item.id === id);
  if (index === -1) {
    return false;
  }

  tasks().splice(index, 1);
  return true;
}
