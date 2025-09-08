#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const planPath = path.resolve(process.cwd(), 'orchestrator/plan.json');

function loadPlan() {
  try {
    const raw = fs.readFileSync(planPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read orchestrator plan at', planPath);
    console.error(err.message);
    process.exit(1);
  }
}

function pickNext(plan) {
  const seq = ['now', 'next', 'later'];
  for (const bucket of seq) {
    const items = plan[bucket] || [];
    const nextItem = items.find((i) => i.status !== 'done' && i.status !== 'blocked');
    if (nextItem) return { bucket, item: nextItem };
  }
  return null;
}

function print(plan) {
  console.log('CharmPals Orchestrator');
  console.log('Version:', plan.version);
  console.log('Vision:', plan.vision);
  console.log('');

  const next = pickNext(plan);
  if (next) {
    console.log('Next Up:', `[${next.item.id}]`, next.item.title);
    console.log('Area:', next.item.area);
    console.log('Detail:', next.item.detail);
  } else {
    console.log('All planned items complete. Add more to orchestrator/plan.json');
  }

  const showBucket = (name) => {
    const arr = plan[name] || [];
    if (!arr.length) return;
    console.log('\n' + name.toUpperCase());
    arr.forEach((t) => {
      const status = t.status.padEnd(11, ' ');
      console.log(` - ${t.id}  [${status}] ${t.title} (${t.area})`);
    });
  };

  ['now', 'next', 'later'].forEach(showBucket);

  console.log('\nTip: Update statuses in orchestrator/plan.json (todo | in_progress | blocked | done).');
}

const plan = loadPlan();
print(plan);

