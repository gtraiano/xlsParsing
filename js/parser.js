import { state } from './state.js';

export const worker = new Worker('./src/worker.js');

export function parseFile(file, skip = 0) {
  if (!file) return;
  state.lastFile = file;

  worker.postMessage({ file, range: skip });
}

export function initWorker(onParsed) {
  worker.onmessage = (e) => {
    state.parsedSheets = e.data;
    state.originalSheets = structuredClone(e.data);
    onParsed(e.data);
  };
}
