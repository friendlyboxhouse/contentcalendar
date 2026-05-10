import { buildUserInitials } from "@/lib/initials";

export type OwnerMemberIdentity = {
  user_id: string;
  display_name: string | null;
  email: string | null;
};

export function memberLabel(m: OwnerMemberIdentity): string {
  const name = m.display_name?.trim();
  const email = m.email?.trim();
  if (name && email) return `${name} (${email})`;
  if (name) return name;
  if (email) return email;
  const fallback = m.user_id.replace(/-/g, "").slice(0, 2).toUpperCase();
  return fallback || buildUserInitials(null, null);
}

export function ownerStoredFromMember(m: OwnerMemberIdentity): string {
  const name = m.display_name?.trim();
  if (name) return name;
  const email = m.email?.trim();
  if (email) return email;
  return memberLabel(m);
}

function normalizeOwner(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function resolveOwnerUserId(
  ownerDisplay: string,
  members: OwnerMemberIdentity[]
): string | null {
  const normalizedOwner = normalizeOwner(ownerDisplay);
  if (!normalizedOwner) return null;

  const match = members.find(
    (member) => normalizeOwner(ownerStoredFromMember(member)) === normalizedOwner
  );
  return match?.user_id ?? null;
}

/** Resolve a stored owner string (display name, email, or user_id) to a human-readable label. */
export function ownerLabelFromStored(
  stored: string,
  members: OwnerMemberIdentity[]
): string {
  const trimmed = (stored ?? "").trim();
  if (!trimmed) return "—";
  // direct user_id match
  const byId = members.find((m) => m.user_id === trimmed);
  if (byId) return byId.display_name?.trim() || byId.email?.trim() || trimmed;
  // stored display/email → resolve back to member
  const uid = resolveOwnerUserId(trimmed, members);
  if (uid) {
    const m = members.find((x) => x.user_id === uid);
    return m?.display_name?.trim() || m?.email?.trim() || trimmed;
  }
  return trimmed; // legacy free-text; return as-is
}

/** Resolve a raw user_id to a display label, with short fallback. */
export function memberLabelFromUserId(
  userId: string,
  members: OwnerMemberIdentity[]
): string {
  if (!userId) return "—";
  const m = members.find((x) => x.user_id === userId);
  if (!m) return userId.slice(0, 8);
  return m.display_name?.trim() || m.email?.trim() || userId.slice(0, 8);
}
