export function buildUserInitials(
  displayName: string | null | undefined,
  email: string | null | undefined
): string {
  const cleanName = (displayName || "").trim();
  if (cleanName) {
    const parts = cleanName.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }

  const userPart = (email || "").split("@")[0]?.trim() || "";
  if (!userPart) return "U";
  return userPart.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200",
  "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-200",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200",
];

export function deterministicAvatarColor(userId: string | null | undefined): string {
  const id = (userId || "").trim();
  if (!id) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
