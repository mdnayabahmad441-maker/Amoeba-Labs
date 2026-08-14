const DEFAULT_PORTAL_ALLOWED_EMAILS = [
  "groenics@gmail.com",
  "mdnayabahmad441@gmail.com",
];

function parseAllowedEmails(value: string | undefined) {
  const emails = value
    ?.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return emails?.length ? emails : undefined;
}

export const PORTAL_ALLOWED_EMAILS =
  parseAllowedEmails(process.env.PORTAL_ALLOWED_EMAILS) ??
  parseAllowedEmails(process.env.PORTAL_ALLOWED_EMAIL) ??
  DEFAULT_PORTAL_ALLOWED_EMAILS;

export const PORTAL_ALLOWED_EMAIL =
  PORTAL_ALLOWED_EMAILS[0] ?? DEFAULT_PORTAL_ALLOWED_EMAILS[0];

export function isPortalAllowedEmail(email: string | null | undefined) {
  return Boolean(
    email && PORTAL_ALLOWED_EMAILS.includes(email.trim().toLowerCase())
  );
}
