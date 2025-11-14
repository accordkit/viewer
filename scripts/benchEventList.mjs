#!/usr/bin/env node
/* eslint-env node */
import { performance } from "node:perf_hooks";

// Quick micro-benchmark for EventList's heavy CPU work (flattening rows + positions)
// This script generates synthetic traces with nested spans and other events,
// then measures the time to flatten them and compute row positions similarly
// to what EventList does. Run with: node viewer/scripts/benchEventList.mjs

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

let idCounter = 1;
function nextId(prefix = 'id') {
    return `${prefix}-${idCounter++}`;
}

function makeSpan(id, parentId, tsMs) {
    return {
        type: 'span',
        ts: new Date(tsMs).toISOString(),
        sessionId: 'demo',
        level: 'info',
        ctx: { traceId: 't1', spanId: id, ...(parentId ? { parentSpanId: parentId } : {}) },
        provider: 'openai',
        model: 'gpt-test',
        operation: 'op:fake',
        durationMs: randInt(1, 2000),
        status: 'ok',
    };
}

function makeMessage(id, parentId, tsMs) {
    return {
        type: 'message',
        ts: new Date(tsMs).toISOString(),
        sessionId: 'demo',
        level: 'info',
        ctx: { traceId: 't1', spanId: id, ...(parentId ? { parentSpanId: parentId } : {}) },
        provider: 'openai',
        model: 'gpt-test',
        role: 'user',
        content: 'hello world',
        format: 'text',
    };
}

// generate a tree-like trace. returns an array of events (spans and child events)
function generateTrace(targetCount) {
    const events = [];
    let ts = Date.now() - 10000;

    function addSpanTree(parentId, depth) {
        if (events.length >= targetCount) return;
        const spanId = nextId('s');
        events.push(makeSpan(spanId, parentId, ts));
        ts += randInt(1, 20);

        // add some inner events
        const inner = randInt(0, depth > 4 ? 2 : 6);
        for (let i = 0; i < inner && events.length < targetCount; i++) {
            if (Math.random() < 0.5) {
                events.push(makeMessage(nextId('m'), spanId, ts));
            } else {
                events.push(makeMessage(nextId('m'), spanId, ts));
            }
            ts += randInt(1, 10);
        }

        const children = Math.random() < 0.7 && depth < 6 ? randInt(0, 3) : 0;
        for (let c = 0; c < children && events.length < targetCount; c++) {
            addSpanTree(spanId, depth + 1);
        }
    }

    const roots = Math.max(1, Math.min(20, Math.floor(targetCount / 5)));
    for (let r = 0; r < roots && events.length < targetCount; r++) {
        addSpanTree(undefined, 0);
    }

    // some orphans
    const orphans = Math.min(10, Math.floor(targetCount / 50));
    for (let o = 0; o < orphans && events.length < targetCount; o++) {
        events.unshift(makeMessage(nextId('o'), undefined, ts - randInt(50, 300)));
    }

    return events.slice(0, targetCount);
}

// flattenEventRows implementation copied from EventList (simplified)
function flattenEventRows({ roots, orphans }) {
    const rows = [];
    orphans.forEach((event, index) => {
        rows.push({ key: `orphan-${event.ts ?? 'ts'}-${index}`, depth: 0, event });
    });

    function visit(node, depth) {
        rows.push({ key: `span-${node.id}`, depth, event: node.event });
        node.events.forEach((event, index) => {
            rows.push({ key: `evt-${node.id}-${event.ts ?? 'ts'}-${index}`, depth: depth + 1, event });
        });
        node.children.forEach((child) => visit(child, depth + 1));
    }

    roots.forEach((node) => visit(node, 0));
    return rows;
}

// buildSpanForest simplified: for our synthetic input we'll group spans by ctx.spanId and parentSpanId
function buildSpanForest(events) {
    const spanMap = new Map();
    const orphans = [];

    // collect spans separately and other events
    for (const e of events) {
        if (e.type === 'span') {
            const id = e.ctx?.spanId ?? nextId('s');
            spanMap.set(id, { id, event: e, events: [], children: [], parent: e.ctx?.parentSpanId });
        }
    }

    // attach non-span events to their span if possible
    for (const e of events) {
        if (e.type === 'span') continue;
        const parent = e.ctx?.parentSpanId;
        if (parent && spanMap.has(parent)) {
            spanMap.get(parent).events.push(e);
        } else {
            orphans.push(e);
        }
    }

    // build tree by parent pointers
    for (const node of spanMap.values()) {
        if (node.parent && spanMap.has(node.parent)) {
            spanMap.get(node.parent).children.push(node);
        }
    }

    // roots are those without a parent or whose parent wasn't found
    const roots = Array.from(spanMap.values()).filter((n) => !n.parent || !spanMap.has(n.parent));
    return { roots, orphans };
}

function computePositions(flattenedRows, rowHeights) {
    const ROW_GAP_PX = 12;
    const ESTIMATED_ROW_HEIGHT = 220;
    const ESTIMATED_ROW_SIZE = ESTIMATED_ROW_HEIGHT + ROW_GAP_PX;
    const positions = [];
    let cursor = 0;
    flattenedRows.forEach((row, index) => {
        const isLast = index === flattenedRows.length - 1;
        const size = rowHeights[row.key] ?? (isLast ? ESTIMATED_ROW_HEIGHT : ESTIMATED_ROW_SIZE);
        positions.push({ start: cursor, size });
        cursor += size;
    });
    return { positions, totalSize: cursor };
}

function benchOnce(eventCount) {
    const events = generateTrace(eventCount);
    const t0 = performance.now();
    const forest = buildSpanForest(events);
    const t1 = performance.now();
    const flattened = flattenEventRows(forest);
    const t2 = performance.now();
    const pos = computePositions(flattened, {});
    const t3 = performance.now();
    return {
        eventCount,
        buildForestMs: t1 - t0,
        flattenMs: t2 - t1,
        positionsMs: t3 - t2,
        rows: flattened.length,
        totalSize: pos.totalSize,
    };
}

function benchSizes(sizes, runs = 3) {
    for (const size of sizes) {
        const results = [];
        for (let i = 0; i < runs; i++) {
            // reset id counter to keep ids small and deterministic-ish across runs
            idCounter = 1;
            results.push(benchOnce(size));
        }

        const avg = (k) => (results.reduce((s, r) => s + r[k], 0) / results.length).toFixed(2);
        console.log(`\n== size: ${size} events (${runs} runs) ==`);
        console.log(`avg buildForest: ${avg('buildForestMs')} ms`);
        console.log(`avg flatten:     ${avg('flattenMs')} ms`);
        console.log(`avg positions:   ${avg('positionsMs')} ms`);
        console.log(`rows produced:   ${results[0].rows} (approx)`);
    }
}

// Run benchmarks: small, medium, large
benchSizes([100, 1000, 5000], 4);
