export function delegateClosest(e, selector) {
    const el = e.target instanceof Element
        ? e.target
        : e.target?.parentElement;
    return el?.closest(selector) || null;
}
