import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export function summarize(root, output) {
    const file = resolve(output, 'performance-before-reload.json');
    if (!existsSync(file)) return undefined;
    const data = JSON.parse(readFileSync(file, 'utf8'));
    const samples = data.samples.slice().sort((a, b) => a - b);
    const limits = JSON.parse(readFileSync(resolve(root, 'tests/browser/fixtures/performance-budgets.json'), 'utf8'));
    const logFile = resolve(output, 'server.log');
    const cold = existsSync(logFile) ? Number(readFileSync(logFile, 'utf8').match(/coldBootstrap:\s*(\d+)ms/)?.[1]) : undefined;
    const finalFile = resolve(output, 'vehicle-final.json');
    const saveFrames = existsSync(finalFile) ? JSON.parse(readFileSync(finalFile, 'utf8')).saves.length : undefined;
    const summary = {
        metric: limits.metric, samples: samples.length, minMs: samples[0],
        medianMs: samples[Math.floor(samples.length / 2)],
        p95Ms: samples[Math.floor(.95 * (samples.length - 1))], maxMs: samples.at(-1),
        attributeMutations: data.mutations, observedRemovedNodeElements: data.removedNodes,
        coldBootstrapMs: cold, saveFrames, budgets: limits.budgets, limitations: limits.limitations,
    };
    summary.proxyBudgetExceeded = samples.length < limits.budgets.minimumMutationSamples
        || summary.p95Ms > limits.budgets.p95Ms || summary.maxMs > limits.budgets.maxMs;
    summary.coldBootstrapBudgetExceeded = cold > limits.budgets.coldModelBootstrapMs;
    writeFileSync(resolve(output, 'performance-summary.json'), JSON.stringify(summary, null, 2));
    console.log(`Pre-paint proxy: p95 ${summary.p95Ms?.toFixed(1)} ms, max ${summary.maxMs?.toFixed(1)} ms (${summary.samples} mutation samples); cold bootstrap ${cold} ms; saves ${saveFrames}`);
    return summary;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    summarize(fileURLToPath(new URL('../../', import.meta.url)), resolve(process.argv[2]));
}
