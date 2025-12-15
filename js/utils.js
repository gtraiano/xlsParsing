export function debounce(fn, delay = 300) {
    let timer = null;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

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
    for (const child of children) element.append(child);
    return element;
}

export function flash(el, color = "yellow") {
    const original = el.style.backgroundColor;
    el.style.backgroundColor = color;
    setTimeout(() => (el.style.backgroundColor = original), 200);
}
