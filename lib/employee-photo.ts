import { supabase } from "./supabase.ts";

/**
 * Extracts the storage object path from a photo_url value.
 * Supports:
 * 1. Relative storage paths (e.g., "ventureId/employeeId/photo.jpg")
 * 2. Legacy absolute Supabase storage URLs (validating hostname against NEXT_PUBLIC_SUPABASE_URL)
 * 3. Stripping cache-busting query parameters (e.g., "?v=12345")
 */
export function extractStoragePath(photoUrlOrPath: string | null | undefined): string | null {
  if (!photoUrlOrPath) return null;
  const trimmed = photoUrlOrPath.trim();
  if (!trimmed) return null;

  // If it's already a relative path
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    const cleanPath = trimmed.split("?")[0].trim();
    const segments = cleanPath.split("/").filter(Boolean);
    if (
      segments.length >= 2 &&
      segments.every((seg) => /^[a-zA-Z0-9._-]+$/.test(seg))
    ) {
      return segments.join("/");
    }
    return null;
  }

  // If it's a full URL, validate the hostname against configured NEXT_PUBLIC_SUPABASE_URL
  try {
    const url = new URL(trimmed);
    const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (configuredSupabaseUrl) {
      try {
        const configuredHost = new URL(configuredSupabaseUrl).hostname.toLowerCase();
        if (url.hostname.toLowerCase() !== configuredHost) {
          // Untrusted or foreign host: refuse to extract as an internal storage path
          return null;
        }
      } catch {
        // If NEXT_PUBLIC_SUPABASE_URL is malformed, reject foreign URLs
        return null;
      }
    }

    const pathname = url.pathname;
    const prefixes = [
      "/storage/v1/object/public/employee-photos/",
      "/storage/v1/object/sign/employee-photos/",
      "/storage/v1/object/authenticated/employee-photos/",
    ];

    for (const prefix of prefixes) {
      if (pathname.startsWith(prefix)) {
        const remaining = pathname.slice(prefix.length);
        const decoded = decodeURIComponent(remaining);
        const segments = decoded.split("/").filter(Boolean);
        if (segments.length >= 2) {
          return segments.join("/");
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Creates a short-lived signed URL (default 1 hour) for an employee photo.
 * Falls back to legacy public URL if signing fails or if the path is invalid.
 */
export async function getEmployeePhotoSignedUrl(
  photoUrlOrPath: string | null | undefined,
  expiresInSeconds = 3600
): Promise<string | null> {
  const path = extractStoragePath(photoUrlOrPath);
  if (!path) {
    // If not a recognized storage path but is a valid URL, return as-is for legacy fallback
    if (photoUrlOrPath && (photoUrlOrPath.startsWith("http://") || photoUrlOrPath.startsWith("https://"))) {
      return photoUrlOrPath;
    }
    return null;
  }

  try {
    const { data, error } = await supabase.storage
      .from("employee-photos")
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data?.signedUrl) {
      // If signed URL generation fails (e.g. offline or unapplied migration),
      // fallback to original string if it was an absolute URL
      if (photoUrlOrPath && (photoUrlOrPath.startsWith("http://") || photoUrlOrPath.startsWith("https://"))) {
        return photoUrlOrPath;
      }
      return null;
    }

    return data.signedUrl;
  } catch {
    if (photoUrlOrPath && (photoUrlOrPath.startsWith("http://") || photoUrlOrPath.startsWith("https://"))) {
      return photoUrlOrPath;
    }
    return null;
  }
}

/**
 * Cleans up orphaned photo files within an employee's dedicated storage directory.
 * Strictly scoped to `${ventureId}/${employeeId}/` to prevent touching files of other employees or ventures.
 */
export async function cleanupOrphanedEmployeePhotos(
  ventureId: string,
  employeeId: string,
  keepFileName: string
): Promise<void> {
  if (!ventureId || !employeeId) return;

  try {
    const folderPath = `${ventureId}/${employeeId}`;
    const { data: files, error: listError } = await supabase.storage
      .from("employee-photos")
      .list(folderPath);

    if (listError || !files || files.length === 0) return;

    const filesToRemove = files
      .filter((file) => file.name && file.name !== keepFileName)
      .map((file) => `${folderPath}/${file.name}`);

    if (filesToRemove.length > 0) {
      await supabase.storage.from("employee-photos").remove(filesToRemove);
    }
  } catch {
    // Non-fatal: cleanup failure should not block photo upload
  }
}
