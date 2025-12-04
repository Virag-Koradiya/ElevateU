export function parseSkills(skillsInput) {
  if (!skillsInput) return [];

  if (Array.isArray(skillsInput)) {
    return skillsInput.map(s => String(s).trim()).filter(Boolean);
  }

  return String(skillsInput)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}
