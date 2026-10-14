/** Parse DB2 CSV exports, including quoted commas and multiline cells. */
export function parseCSV(text) {
    const rows = [];
    let row = [], value = "", quoted = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            if (quoted && text[i + 1] === '"') { value += '"'; i++; }
            else quoted = !quoted;
        } else if (!quoted && (char === "," || char === "\n" || char === "\r")) {
            row.push(value); value = "";
            if (char !== ",") {
                rows.push(row); row = [];
                if (char === "\r" && text[i + 1] === "\n") i++;
            }
        } else value += char;
    }
    if (quoted) throw new Error("Unterminated CSV cell");
    if (value !== "" || row.length > 0) { row.push(value); rows.push(row); }
    const header = rows.shift();
    if (!header) throw new Error("Empty CSV");
    header[0] = header[0].replace(/^\uFEFF/, "");
    return rows.map(fields => {
        if (fields.length !== header.length) throw new Error("Unexpected CSV field count");
        return Object.fromEntries(header.map((key, index) => [key, fields[index]]));
    });
}
