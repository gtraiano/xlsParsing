// store.js
const subscribers = new Set();

export function subscribe(fn) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
}

export function notify() {
    for (const fn of subscribers) fn();
}
