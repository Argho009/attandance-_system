import { verifyToken } from '../_middleware.js';


export async function onRequestPost(context) {
  const { request, env, params } = context;
  const fnName = params.fn;
  const user = await verifyToken(request, env.JWT_SECRET || 'cams-secret-key');
  if (!user) return Response.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await request.json();

  try {
    switch (fnName) {

      // ── CREATE USER ──────────────────────────────────────────
      case 'create_system_user': {
        const { p_college_id, p_name, p_role, p_additional_data = {} } = body;
        const rollNo = p_additional_data.roll_no;
        const branch = p_additional_data.branch;
        const sem    = p_additional_data.sem;

        // Derive password: last 5 of roll_no for students, college_id for others
        let password = p_additional_data.password;
        if (!password) {
          password = (p_role === 'student' && rollNo) ? rollNo.slice(-5) : p_college_id;
        }

        const userId = crypto.randomUUID();

        await env.DB.prepare(
          `INSERT INTO users (id, college_id, name, role, password_hash, initial_password)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(college_id) DO UPDATE SET name=excluded.name, role=excluded.role, 
           password_hash=excluded.password_hash, initial_password=excluded.initial_password`
        ).bind(userId, p_college_id.toUpperCase(), p_name, p_role, password, password).run();

        if (p_role === 'student' && rollNo) {
          const { results } = await env.DB.prepare(`SELECT id FROM users WHERE college_id = ?`).bind(p_college_id.toUpperCase()).all();
          const uid = results?.[0]?.id || userId;
          await env.DB.prepare(
            `INSERT INTO students (id, user_id, roll_no, branch, sem)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(roll_no) DO UPDATE SET branch=excluded.branch, sem=excluded.sem`
          ).bind(crypto.randomUUID(), uid, rollNo, branch, sem).run();
        }

        return Response.json(userId);
      }

      // ── SYNC USER (no-op in D1 mode) ────────────────────────
      case 'sync_user_to_auth':
      case 'sync_all_users_to_auth':
        return Response.json({ success: true });

      // ── SYSTEM HEALTH ────────────────────────────────────────
      case 'get_system_health': {
        const [users, students, branches] = await Promise.all([
          env.DB.prepare(`SELECT COUNT(*) as c FROM users WHERE is_active=1 AND deleted_at IS NULL`).first(),
          env.DB.prepare(`SELECT COUNT(*) as c FROM students`).first(),
          env.DB.prepare(`SELECT COUNT(*) as c FROM branches`).first(),
        ]);
        return Response.json({
          total_users: users?.c ?? 0,
          auth_users: users?.c ?? 0,
          missing_from_auth: 0,
          missing_identities: 0,
          total_students: students?.c ?? 0,
          total_branches: branches?.c ?? 0,
          db_size_mb: 'N/A',
        });
      }

      // ── BROKEN USERS (none in D1, auth is built-in) ─────────
      case 'get_broken_users':
        return Response.json([]);

      // ── RESET PASSWORD ───────────────────────────────────────
      case 'admin_reset_password': {
        const { target_id, new_password } = body;
        await env.DB.prepare(`UPDATE users SET password_hash=?, initial_password=? WHERE id=?`)
          .bind(new_password, new_password, target_id).run();
        return Response.json({ success: true });
      }

      default:
        return Response.json({ message: `Unknown function: ${fnName}` }, { status: 404 });
    }
  } catch (e) {
    return Response.json({ message: e.message }, { status: 500 });
  }
}
