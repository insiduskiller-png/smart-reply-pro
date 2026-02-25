export function sanitizeText(value: unknown, max = 4000) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

export function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return "";
  return sanitizeText(value, 320).toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
