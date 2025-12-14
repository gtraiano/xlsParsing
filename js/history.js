import { notify } from "./store.js";

export class History {
    stack = [];
    index = -1;

    push(diff) {
        this.stack = this.stack.slice(0, this.index + 1);
        this.stack.push(diff);
        this.index++;
        notify();          // 🔔 state changed
    }

    undo() {
        if (this.index < 0) return;
        this.stack[this.index--].undo();
        notify();          // 🔔 state changed
    }

    redo() {
        if (this.index >= this.stack.length - 1) return;
        this.stack[++this.index].redo();
        notify();          // 🔔 state changed
    }
}

export const history = new History();
