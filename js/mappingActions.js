import { mapColumns } from "./state.js";

export function applyMap(property, fromKey, fromHeader) {
    const entry = mapColumns[property];
    entry.history.push({
        fromKey,
        fromHeader,
        toKey: property,
        toHeader: entry.label
    });
    entry.mapped = fromKey;
}

export function applyUnmap(property) {
    const entry = mapColumns[property];
    if (!entry.mapped) return null;
    const snapshot = entry.history.pop();
    entry.mapped = null;
    return snapshot;
}
