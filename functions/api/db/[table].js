// functions/api/db/[table].js
// Handles all CRUD against D1 for any table
// GET    /api/db/:table?select=*&filter=...
// POST   /api/db/:table          -> INSERT
// PATCH  /api/db/:table          -> UPDATE
// DELETE /api/db/:table          -> DELETE

import { verifyToken } from '../../_middleware.js';

const ALLOWED_TABLES = [
  'users', 'branches', 'students', 'subjects', 'subject_assignments',
  'lectures', 'attendance', 'notices', 'system_config', 'bulk_upload_logs',
  'ct_marks', 'endsem_marks', 'holidays', 'timetable', 'leave_requests',
  'attendance_condonation', 'attendance_change_requests', 'semester_summary',
  'archive_log', 'semester_transitions',
];

export async function onRequest(context) {
  const { request, env, params } = context;
  const table = params.table;

  if (!ALLOWED_TABLES.includes(table)) {
    return Response.json({ message: 'Table not allowed' }, { status: 403 });
  }

  const user = await verifyToken(request, env.JWT_SECRET || 'cams-secret-key');
  if (!user) return Response.json({ message: 'Unauthorized' }, { status: 401 });

  const method = request.method;

  try {
    if (method === 'GET') return handleSelect(request, env.DB, table);
    if (method === 'POST') return handleInsert(request, env.DB, table, user);
    if (method === 'PATCH') return handleUpdate(request, env.DB, table, user);
    if (method === 'DELETE') return handleDelete(request, env.DB, table, user);
    return Response.json({ message: 'Method not allowed' }, { status: 405 });
  } catch (e) {
    return Response.json({ message: e.message }, { status: 500 });
  }
}

// ── SELECT ──────────────────────────────────────────────
async function handleSelect(request, DB, table) {
  const url = new URL(request.url);
  const select = url.searchParams.get('select') || '*';
  const filters = url.searchParams.getAll('filter').map(f => JSON.parse(f));
  const order = url.searchParams.get('order') ? JSON.parse(url.searchParams.get('order')) : null;
  const limit = url.searchParams.get('limit');

  const cols = parseSelectCols(select, table);
  let sql = `SELECT ${cols} FROM ${table}`;
  const bindings = [];

  if (filters.length > 0) {
    const conditions = filters.map(f => buildFilter(f, bindings));
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }
  if (order) sql += ` ORDER BY ${order.col} ${order.ascending ? 'ASC' : 'DESC'}`;
  if (limit) sql += ` LIMIT ${parseInt(limit)}`;

  const { results } = await DB.prepare(sql).bind(...bindings).all();
  return Response.json(results);
}

// ── INSERT ──────────────────────────────────────────────
async function handleInsert(request, DB, table, user) {
  const rows = await request.json();
  const results = [];
  for (const row of rows) {
    if (!row.id) row.id = crypto.randomUUID();
    const keys = Object.keys(row);
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')}) ON CONFLICT DO NOTHING`;
    await DB.prepare(sql).bind(...Object.values(row)).run();
    results.push(row);
  }
  return Response.json(results);
}

// ── UPDATE ──────────────────────────────────────────────
async function handleUpdate(request, DB, table) {
  const { filters, payload } = await request.json();
  const setCols = Object.keys(payload).map(k => `${k} = ?`).join(', ');
  const bindings = [...Object.values(payload)];
  const conditions = filters.map(f => buildFilter(f, bindings));
  const sql = `UPDATE ${table} SET ${setCols} WHERE ${conditions.join(' AND ')}`;
  await DB.prepare(sql).bind(...bindings).run();
  return Response.json({ success: true });
}

// ── DELETE ──────────────────────────────────────────────
async function handleDelete(request, DB, table) {
  const { filters } = await request.json();
  const bindings = [];
  const conditions = filters.map(f => buildFilter(f, bindings));
  const sql = `DELETE FROM ${table} WHERE ${conditions.join(' AND ')}`;
  await DB.prepare(sql).bind(...bindings).run();
  return Response.json({ success: true });
}

// ── HELPERS ────────────────────────────────────────────
function buildFilter(f, bindings) {
  if (f.op === 'is' && f.val === null) return `${f.col} IS NULL`;
  if (f.op === 'is') { bindings.push(f.val); return `${f.col} IS ?`; }
  if (f.op === 'eq') { bindings.push(f.val); return `${f.col} = ?`; }
  if (f.op === 'neq') { bindings.push(f.val); return `${f.col} != ?`; }
  if (f.op === 'gt') { bindings.push(f.val); return `${f.col} > ?`; }
  if (f.op === 'gte') { bindings.push(f.val); return `${f.col} >= ?`; }
  if (f.op === 'lt') { bindings.push(f.val); return `${f.col} < ?`; }
  if (f.op === 'lte') { bindings.push(f.val); return `${f.col} <= ?`; }
  if (f.op === 'in') {
    const placeholders = f.val.map(() => '?').join(',');
    bindings.push(...f.val);
    return `${f.col} IN (${placeholders})`;
  }
  return '1=1';
}

// Simple column parser — handles 'users(name)' style joins as flat cols for now
function parseSelectCols(select, table) {
  if (select === '*') return '*';
  return select.split(',').map(c => c.trim().split('(')[0].trim()).join(', ');
}
