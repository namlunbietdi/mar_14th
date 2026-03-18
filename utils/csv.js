function escapeCsvValue(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function normalizeImportedStatus(status) {
  const value = String(status || "").trim().toLowerCase();

  if (value === "dang lam viec" || value === "working") {
    return "working";
  }

  if (value === "da nghi" || value === "left") {
    return "left";
  }

  return "";
}

module.exports = {
  escapeCsvValue,
  normalizeImportedStatus,
  parseCsvLine
};
