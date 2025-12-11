// ---------------------------------------------------------------------
// utils.js
// Small utilities used across the app
// ---------------------------------------------------------------------

// Debounce: wait N ms after the last call before running fn
export function debounce(fn, delay = 300) {
    let timer = null;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

// Returns a deep clone of a plain object/array
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Quick DOM helper for creating elements
export function el(tag, attrs = {}, ...children) {
    const element = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === "class") element.className = v;
        else if (k.startsWith("on") && typeof v === "function") {
            element.addEventListener(k.substring(2), v);
        } else {
            element.setAttribute(k, v);
        }
    }
    for (const child of children) {
        element.append(child);
    }
    return element;
}

// Makes an element temporarily flash (used for debugging UI updates)
export function flash(el, color = "yellow") {
    const original = el.style.backgroundColor;
    el.style.backgroundColor = color;
    setTimeout(() => (el.style.backgroundColor = original), 200);
}
