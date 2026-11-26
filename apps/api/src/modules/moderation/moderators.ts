/** Lowercased, trimmed, non-empty entries of MODERATOR_EMAILS. */
export function parseModeratorEmails(raw: string | null | undefined): ReadonlySet<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0),
  );
}

/** True when `email` (trimmed, lowercased) is on the list. False for a missing email or an empty list. */
export function isModeratorEmail(raw: string | null | undefined, email: string | null | undefined): boolean {
  if (!email) return false;
  return parseModeratorEmails(raw).has(email.trim().toLowerCase());
}
