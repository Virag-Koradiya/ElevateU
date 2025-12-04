export function parseRequirements(input) {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input.map(r => String(r).trim()).filter(Boolean);
  }

  return String(input)
    .split(",")
    .map(r => r.trim())
    .filter(Boolean);
}

export function buildJobSearchQuery(keyword = "") {
  const normalized = String(keyword).trim();
  if (!normalized) {
    return {}; 
  }

  return {
    $or: [
      { title: { $regex: normalized, $options: "i" } },
      { description: { $regex: normalized, $options: "i" } },
    ],
  };
}
