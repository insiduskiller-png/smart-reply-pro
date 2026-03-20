export type UsernameColorPreset = "default" | "blue-purple" | "cyan-neon" | "gold-orange";
export const USERNAME_TRANSITION_DURATION_MS = 10000;

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
