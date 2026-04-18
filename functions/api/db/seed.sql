-- Seed the admin account for CAMS D1
-- Password stored as plain text for direct comparison (simple auth)
INSERT OR REPLACE INTO users (id, college_id, name, role, password_hash, initial_password, is_active)
VALUES (
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))),
  'ADMIN123',
  'Main Administrator',
  'admin',
  '123',
  '123',
  1
);
