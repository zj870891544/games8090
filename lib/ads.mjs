/** @param {string[]} inputs */
export function aggregateAds(inputs) {
  const records = new Map();
  for (const input of inputs)
    for (const raw of input.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const value = line.split("#")[0].trim();
      const parts = value.split(",").map((v) => v.trim());
      if (parts.length >= 3) {
        parts[0] = parts[0].toLowerCase();
        parts[2] = parts[2].toUpperCase();
      }
      const normalized = parts.join(", ");
      if (!records.has(normalized)) records.set(normalized, normalized);
    }
  return [...records.values()].sort().join("\n") + "\n";
}
