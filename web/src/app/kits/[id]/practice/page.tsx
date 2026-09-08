import { AuthGate } from "@/components/AuthGate";
import { PracticeClient } from "@/components/PracticeClient";

export default async function PracticePage(props: PageProps<"/kits/[id]/practice">) {
  const { id } = await props.params;
  return (
    <AuthGate>
      <PracticeClient id={id} />
    </AuthGate>
  );
}
