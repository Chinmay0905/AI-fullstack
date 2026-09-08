"use client";

import { AuthGate } from "@/components/AuthGate";
import { CreateKitForm } from "@/components/CreateKitForm";
import { KitList } from "@/components/KitList";

export default function DashboardPage() {
  return (
    <AuthGate>
      <div className="flex flex-col gap-8">
        <section>
          <h1 className="mb-3 text-lg font-semibold">New kit</h1>
          <CreateKitForm />
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Your kits</h2>
          <KitList />
        </section>
      </div>
    </AuthGate>
  );
}
