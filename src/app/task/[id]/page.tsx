import { EditTaskForm } from "@/components/EditTaskForm";

export const dynamic = "force-dynamic";

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main>
      <h1>Editar tarefa</h1>
      <EditTaskForm id={id} />
    </main>
  );
}
