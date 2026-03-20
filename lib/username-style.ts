export type UsernameColorPreset = "default" | "blue-purple" | "cyan-neon" | "gold-orange";

export const USERNAME_COLOR_OPTIONS: Array<{ value: UsernameColorPreset; label: string }> = [
  { value: "default", label: "Default (Blue → Purple)" },
  { value: "blue-purple", label: "Blue → Purple" },
  { value: "cyan-neon", label: "Cyan → Neon Blue" },
  { value: "gold-orange", label: "Gold → Orange" },
];

export function normalizeUsernamePreset(value?: string | null): UsernameColorPreset {
  if (value === "blue-purple" || value === "cyan-neon" || value === "gold-orange") {
    return value;
  }
  return "default";
}

export function getUsernameTextClass(isPro: boolean, usernameColor?: string | null) {
  if (!isPro) {
    return "text-white";
  }

  const preset = normalizeUsernamePreset(usernameColor);

  if (preset === "cyan-neon") {
    return "username-gradient username-gradient-cyan-neon";
  }
  if (preset === "gold-orange") {
    return "username-gradient username-gradient-gold-orange";
  }

  return "username-gradient username-gradient-blue-purple";
}

export function resolveUsernameColor(usernameColor?: string | null) {
  if (!usernameColor) {
    return "#ffffff";
  }

  const normalized = usernameColor.trim().toLowerCase();

  if (normalized.startsWith("#")) {
    return normalized;
  }

  if (normalized === "cyan-neon") {
    return "#22d3ee";
  }

  if (normalized === "gold-orange") {
    return "#fbbf24";
  }

  if (normalized === "blue-purple" || normalized === "default") {
    return "#c4b5fd";
  }

  return "#ffffff";
}
