import Link from "next/link";
import { models } from "@/lib/models";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Model dashboard</h1>
        <p className="text-sm text-zinc-600">
          Each model has a single active thread per user. Clear chat resets that
          model&apos;s history.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {models.map((model) => (
          <Link
            key={model.id}
            href={`/chat/${encodeURIComponent(model.id)}`}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-300"
          >
            <h2 className="text-lg font-semibold text-zinc-900">
              {model.displayName}
            </h2>
            <p className="mt-2 text-sm text-zinc-600">{model.id}</p>
            <div className="mt-4 text-sm font-medium text-zinc-900">
              Open chat →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
