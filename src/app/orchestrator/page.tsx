import fs from 'node:fs';
import path from 'node:path';
import { notFound } from 'next/navigation';

type PlanItem = {
  id: string;
  title: string;
  detail: string;
  status: 'todo' | 'in_progress' | 'blocked' | 'done';
  area: string;
};

type Plan = {
  version: string;
  vision: string;
  now: PlanItem[];
  next: PlanItem[];
  later: PlanItem[];
};

function loadPlan(): Plan {
  const planPath = path.resolve(process.cwd(), 'orchestrator/plan.json');
  const raw = fs.readFileSync(planPath, 'utf8');
  return JSON.parse(raw);
}

function Badge({ status }: { status: PlanItem['status'] }) {
  const map: Record<PlanItem['status'], string> = {
    todo: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    blocked: 'bg-red-100 text-red-800',
    done: 'bg-green-100 text-green-800',
  };
  return (
    <span className={`px-2 py-1 text-xs rounded font-medium ${map[status]}`}>{status}</span>
  );
}

function Section({ title, items }: { title: string; items: PlanItem[] }) {
  if (!items?.length) return null;
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-3">{title}</h2>
      <div className="space-y-3">
        {items.map((t) => (
          <div key={t.id} className="p-4 border rounded-lg bg-white flex items-start gap-3">
            <div className="mt-1 text-gray-400">{t.id}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">{t.title}</h3>
                <Badge status={t.status} />
                <span className="text-xs text-gray-500">{t.area}</span>
              </div>
              <p className="text-gray-600 text-sm mt-1">{t.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function OrchestratorPage() {
  // Hide orchestrator unless explicitly enabled
  if (process.env.NEXT_PUBLIC_SHOW_ORCHESTRATOR !== '1') return notFound();
  const plan = loadPlan();

  const pickNext = () => {
    for (const bucket of ['now', 'next', 'later'] as const) {
      const arr = plan[bucket] || [];
      const item = arr.find((i) => i.status !== 'done' && i.status !== 'blocked');
      if (item) return { bucket, item };
    }
    return null;
  };

  const next = pickNext();

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Orchestrator</h1>
          <p className="text-gray-600">Version {plan.version}</p>
          <p className="text-gray-700 mt-3">{plan.vision}</p>
          {next && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-800 mb-1">Next Up</div>
              <div className="font-semibold text-blue-900">[{next.item.id}] {next.item.title}</div>
              <div className="text-sm text-blue-800">{next.item.detail}</div>
            </div>
          )}
          <div className="mt-4 text-sm text-gray-500">
            Edit the plan in <code className="px-1 py-0.5 bg-gray-100 rounded">orchestrator/plan.json</code>.
          </div>
        </div>

        <Section title="Now" items={plan.now} />
        <Section title="Next" items={plan.next} />
        <Section title="Later" items={plan.later} />
      </div>
    </div>
  );
}
