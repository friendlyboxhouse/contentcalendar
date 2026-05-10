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
