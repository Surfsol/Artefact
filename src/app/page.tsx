import Link from "next/link";
import { HttpTaskCount } from "@/components/HttpTaskCount";
import { createCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const tasks = await createCaller().task.list();
  console.log({tasks});

  return (
    <main>
      <h1>Tarefas</h1>
      <Link href="/new">Nova tarefa</Link>
      <HttpTaskCount />
      <ul>
        {tasks.items.map((task) => (
          <li key={task.id}>{task.titulo}</li>
        ))}
      </ul>
    </main>
  );
}
