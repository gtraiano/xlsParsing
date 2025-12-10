// Separate state for Parse File tab vs Custom Table tab
export const parseFileState = {
    tableModel: null,
    lastFile: null,
    output: null,          // #output
    columnBoxes: null      // #columnBoxes
};

export const createTableState = {
    tableModel: null,
    output: null,          // #customOutput
    columnBoxes: null      // #customColumnBoxes
};
