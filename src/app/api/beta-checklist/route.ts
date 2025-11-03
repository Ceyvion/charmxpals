import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { getBetaChecklistProgress, setBetaChecklistProgress } from '@/lib/betaChecklistStore';
import { betaChecklistTasks } from '@/data/betaChecklist';

const validTaskIds = new Set(betaChecklistTasks.map((task) => task.id));

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  const record = await getBetaChecklistProgress(userId);
  if (!record) {
    return Response.json({ success: true, record: null });
  }
  return Response.json({
    success: true,
    record: {
      progress: record.progress,
      updatedAtIso: record.updatedAt,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }

  if (!payload || typeof payload !== 'object') {
    return Response.json({ success: false, error: 'invalid_payload' }, { status: 400 });
  }

  const progress = sanitizeProgress((payload as { progress?: unknown }).progress);
  const record = await setBetaChecklistProgress(userId, progress);
  return Response.json({
    success: true,
    record: {
      progress: record.progress,
      updatedAtIso: record.updatedAt,
    },
  });
}

function sanitizeProgress(progress: unknown): Record<string, boolean> {
  if (!progress || typeof progress !== 'object') return {};
  const entries = Object.entries(progress as Record<string, unknown>);
  const next: Record<string, boolean> = {};
  for (const [taskId, value] of entries) {
    if (!validTaskIds.has(taskId)) continue;
    next[taskId] = Boolean(value);
  }
  return next;
}
