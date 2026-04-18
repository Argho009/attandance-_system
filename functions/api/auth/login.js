// functions/api/auth/login.js
// Handles POST /api/auth/login
// Verifies college_id + password against D1, returns a JWT-like token

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { college_id, password } = await request.json();

    if (!college_id || !password) {
      return Response.json({ message: 'College ID and password are required' }, { status: 400 });
    }

    // Look up user in D1
    const { results } = await env.DB.prepare(
      `SELECT * FROM users WHERE college_id = ? AND is_active = 1 AND deleted_at IS NULL`
    ).bind(college_id.toUpperCase()).all();

    const user = results?.[0];
    if (!user) {
      return Response.json({ message: 'Invalid credentials' }, { status: 401 });
    }

  // Verify password — supports plain-text (seeded accounts) and SHA-256 hashed passwords
  const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return Response.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // Build simple signed token (HMAC-SHA256)
    const payload = {
      sub: user.id,
      college_id: user.college_id,
      role: user.role,
      name: user.name,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24h
    };

    const token = await signToken(payload, env.JWT_SECRET || 'cams-secret-key');

    return Response.json({
      token,
      user: {
        id: user.id,
        college_id: user.college_id,
        name: user.name,
        role: user.role,
        app_metadata: { role: user.role },
        user_metadata: { name: user.name },
      }
    });

  } catch (e) {
    return Response.json({ message: 'Server error: ' + e.message }, { status: 500 });
  }
}

// Verifies plaintext password against stored hash
// Supports both plain SHA-256 (new D1 users) and plain-text comparison (for seeded accounts)
async function verifyPassword(password, hash) {
  if (!hash) return false;
  // Plain text fallback for simple accounts
  if (hash === password) return true;
  // SHA-256 comparison
  const encoded = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  if (hashHex === hash) return true;
  return false;
}

// Creates a simple HMAC-SHA256 JWT
async function signToken(payload, secret) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const body = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigStr = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${data}.${sigStr}`;
}
