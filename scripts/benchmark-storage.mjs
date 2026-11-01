import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

// Offline synthetic data: measures domain validation/serialization, not browser disk I/O.
const server = await createServer({
  root: fileURLToPath(new URL('..', import.meta.url)),
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom',
});
try {
  const { createPlan } = await server.ssrLoadModule('/src/domain/planner.ts');
  const { starterAdvice } = await server.ssrLoadModule('/src/domain/starter.ts');
  const { loadPlans, savePlans } = await server.ssrLoadModule('/src/lib/storage.ts');
  const data = new Map();
  globalThis.localStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
  const brief = {
    title: 'Synthetic benchmark gathering',
    type: 'community',
    date: '2027-04-12',
    location: 'Chennai',
    guests: 80,
    budgetPaise: 5_000_000,
    priorities: ['Food'],
    notes: '',
    timeZone: 'Asia/Kolkata',
  };
  let plans = Array.from({ length: 12 }, () => ({
    ...createPlan(brief, starterAdvice(brief), 'starter', new Date('2026-11-01T12:00:00Z')),
    ai: { prompt: 'Synthetic prompt', response: 'x'.repeat(49_000), model: 'benchmark' },
  }));
  savePlans(plans);
  function measure(operation) {
    for (let index = 0; index < 10; index++) operation();
    const samples = Array.from({ length: 40 }, () => {
      const start = performance.now();
      operation();
      return performance.now() - start;
    }).sort((a, b) => a - b);
    return { medianMs: Number(((samples[19] + samples[20]) / 2).toFixed(3)), samples: 40 };
  }
  const save = measure(() => {
    plans = plans.map((plan, index) =>
      index
        ? plan
        : {
            ...plan,
            tasks: plan.tasks.map((task, taskIndex) =>
              taskIndex ? task : { ...task, done: !task.done },
            ),
          },
    );
    savePlans(plans);
  });
  const load = measure(() => loadPlans());
  console.log(
    JSON.stringify(
      {
        node: process.version,
        plans: 12,
        payloadCharacters: data.get('gatherly.plans.v1').length,
        save,
        load,
      },
      null,
      2,
    ),
  );
} finally {
  await server.close();
}
