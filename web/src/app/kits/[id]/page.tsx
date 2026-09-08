import { AuthGate } from "@/components/AuthGate";
import { KitDetailClient } from "@/components/KitDetailClient";

export default async function KitDetailPage(props: PageProps<"/kits/[id]">) {
  const { id } = await props.params;
  return (
    <AuthGate>
      <KitDetailClient id={id} />
    </AuthGate>
  );
}
