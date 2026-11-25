import Link from "next/link";
import { TaskList } from "@/components/TaskList";
import { createCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initialPage = await createCaller().task.list({ limit: 10 });

  return (
    <main>
      <h1>Tarefas</h1>
      <Link href="/new">Nova tarefa</Link>
      <TaskList initialPage={initialPage} />
    </main>
  );
}
