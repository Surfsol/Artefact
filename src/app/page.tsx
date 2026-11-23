import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>Tarefas</h1>
      <Link href="/new">Nova tarefa</Link>
    </main>
  );
}
