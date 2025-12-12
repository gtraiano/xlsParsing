import { dragState, mapColumns } from "./state.js";

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

    /*
    container.addEventListener("dragstart", e => {
        const box = e.target.closest(".columnBox");
        if (!box) return;

        dragState.key = box.dataset.property;
        dragState.label = box.textContent;

        e.dataTransfer.setData("application/json", JSON.stringify({
            property: dragState.key,
            label: dragState.label
        }));

        e.dataTransfer.effectAllowed = "move";
        box.classList.add("dragging");
    });
    */

    document.querySelectorAll(".columnBox").forEach(box => {
        box.setAttribute("draggable", true);

        box.addEventListener("dragstart", e => {
            box.classList.add("dragging");

            const data = {
                property: box.dataset.property,
                label: box.textContent
            };
            e.dataTransfer.setData("application/json", JSON.stringify(data));
            e.dataTransfer.effectAllowed = "move";
        });

        box.addEventListener("dragend", e => {
            box.classList.remove("dragging");

            // clear all invalid/dragover classes on headers
            document.querySelectorAll("th.dragover, th.invalid-drop").forEach(th => {
                th.classList.remove("dragover", "invalid-drop");
            });
        });
    });


    container.addEventListener("dragend", e => {
        dragState.key = null;
        dragState.label = null;
        const box = e.target.closest(".columnBox");
        if (!box) return;
        box.classList.remove("dragging");
    });
}
