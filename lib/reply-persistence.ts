export const FAVORITE_CONTEXT_PREFIX = "[[SRP_FAVORITE]]\n";

type ColumnError = {
  code?: string;
  message?: string;
  details?: string;
} | null | undefined;

export type ReplyRow = {
  id: string;
  input: string;
  context?: string | null;
  tone: string;
  reply: string;
  created_at?: string | null;
  favorite?: boolean | null;
  [key: string]: unknown;
};

export function isMissingFavoriteColumnError(error: ColumnError) {
  if (!error) return false;
  const details = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return error.code === "42703" && details.includes("favorite") || details.includes("column") && details.includes("favorite");
}

export function hasFavoriteMarker(context?: string | null) {
  return typeof context === "string" && context.startsWith(FAVORITE_CONTEXT_PREFIX);
}

export function stripFavoriteMarker(context?: string | null) {
  if (!hasFavoriteMarker(context)) {
    return context ?? null;
  }

  const stripped = context!.slice(FAVORITE_CONTEXT_PREFIX.length);
  return stripped || null;
}

export function encodeFavoriteContext(context: string | null | undefined, favorite: boolean) {
  const normalized = typeof context === "string" && context.length > 0 ? context : null;
  if (!favorite) {
    return normalized;
  }

  return `${FAVORITE_CONTEXT_PREFIX}${normalized ?? ""}`;
}

export function serializeReplyRow(row: ReplyRow, hasFavoriteColumn: boolean) {
  return {
    ...row,
    context: stripFavoriteMarker(row.context),
    favorite: hasFavoriteColumn ? Boolean(row.favorite) : hasFavoriteMarker(row.context),
  };
}
