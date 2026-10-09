import test from "node:test";
import assert from "node:assert/strict";
import { extractStoragePath } from "./employee-photo.ts";

test("extractStoragePath handles relative paths", () => {
  const relPath = "550e8400-e29b-41d4-a716-446655440000/123e4567-e89b-12d3-a456-426614174000/photo.jpg";
  assert.equal(extractStoragePath(relPath), relPath);

  // With query parameter
  assert.equal(extractStoragePath(`${relPath}?v=123456789`), relPath);
});

test("extractStoragePath handles legacy public Supabase URLs", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example-project.supabase.co";

  const publicUrl = "https://example-project.supabase.co/storage/v1/object/public/employee-photos/venture-123/emp-456/photo.png?v=987654";
  assert.equal(extractStoragePath(publicUrl), "venture-123/emp-456/photo.png");

  const signUrl = "https://example-project.supabase.co/storage/v1/object/sign/employee-photos/venture-123/emp-456/photo.webp?token=xyz";
  assert.equal(extractStoragePath(signUrl), "venture-123/emp-456/photo.webp");
});

test("extractStoragePath rejects foreign hostnames", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example-project.supabase.co";

  const maliciousUrl = "https://attacker.com/storage/v1/object/public/employee-photos/venture-123/emp-456/photo.png";
  assert.equal(extractStoragePath(maliciousUrl), null);
});

test("extractStoragePath handles null, empty, or malformed inputs gracefully", () => {
  assert.equal(extractStoragePath(null), null);
  assert.equal(extractStoragePath(""), null);
  assert.equal(extractStoragePath("   "), null);
  assert.equal(extractStoragePath("just-a-filename.jpg"), null);
  assert.equal(extractStoragePath("not a valid url / invalid"), null);
});
