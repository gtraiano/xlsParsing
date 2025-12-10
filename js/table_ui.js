import { mapColumns } from "./mapColumns.js";

export function initColumnBoxes(container) {
    container.innerHTML = "";
    Object.values(mapColumns).forEach(mp => {
        const box = document.createElement("span");
        box.className = "columnBox";
        box.draggable = true;
        box.textContent = mp.label;
        box.dataset.property = mp.property;
        container.appendChild(box);
    });

    container.addEventListener("dragstart", e => {
        const box = e.target.closest(".columnBox");
        if (!box) return;
        e.dataTransfer.setData("application/json", JSON.stringify({
            label: box.textContent,
            property: box.dataset.property
        }));
        e.dataTransfer.effectAllowed = "move";
        box.classList.add("dragging");
    });
    container.addEventListener("dragend", e => {
        const box = e.target.closest(".columnBox");
        if (!box) return;
        box.classList.remove("dragging");
    });
}
