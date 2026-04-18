// ╔══════════════════════════════════════════════════════════════════╗
// ║  D1 API CLIENT — Drop-in replacement for @supabase/supabase-js  ║
// ║  All pages continue to use: import { supabase } from './supabase'║
// ╚══════════════════════════════════════════════════════════════════╝

const API_BASE = '/api';

// -- Auth token management --
const getToken = () => sessionStorage.getItem('cams_token');
const setToken = (t) => sessionStorage.setItem('cams_token', t);
const clearToken = () => sessionStorage.removeItem('cams_token');

let _currentUser = null;
try { _currentUser = JSON.parse(sessionStorage.getItem('cams_user')); } catch (_e) { /* silent — no saved session */ }


// -- Core fetch helper --
async function apiFetch(path, opts = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const json = await res.json();
  if (!res.ok) return { data: null, error: json };
  return { data: json, error: null };
}

// -- Query builder --
class QueryBuilder {
  constructor(table) {
    this._table = table;
    this._filters = [];
    this._selectCols = '*';
    this._order = null;
    this._limit = null;
    this._isSingle = false;
    this._isMaybeSingle = false;
  }

  select(cols = '*') { this._selectCols = cols; return this; }
  eq(col, val) { this._filters.push({ op: 'eq', col, val }); return this; }
  neq(col, val) { this._filters.push({ op: 'neq', col, val }); return this; }
  is(col, val) { this._filters.push({ op: 'is', col, val }); return this; }
  in(col, vals) { this._filters.push({ op: 'in', col, val: vals }); return this; }
  gt(col, val) { this._filters.push({ op: 'gt', col, val }); return this; }
  gte(col, val) { this._filters.push({ op: 'gte', col, val }); return this; }
  lt(col, val) { this._filters.push({ op: 'lt', col, val }); return this; }
  lte(col, val) { this._filters.push({ op: 'lte', col, val }); return this; }
  order(col, { ascending = true } = {}) { this._order = { col, ascending }; return this; }
  limit(n) { this._limit = n; return this; }
  single() { this._isSingle = true; return this; }
  maybeSingle() { this._isMaybeSingle = true; return this; }

  _buildQuery() {
    const params = new URLSearchParams();
    params.set('select', this._selectCols);
    this._filters.forEach(f => params.append('filter', JSON.stringify(f)));
    if (this._order) params.set('order', JSON.stringify(this._order));
    if (this._limit) params.set('limit', this._limit);
    return params.toString();
  }

  // -- READ --
  async then(resolve, reject) {
    try {
      const { data, error } = await apiFetch(`/db/${this._table}?${this._buildQuery()}`);
      if (error) return resolve({ data: null, error });
      const result = (this._isSingle || this._isMaybeSingle) ? (data?.[0] ?? null) : data;
      resolve({ data: result, error: null });
    } catch(e) {
      reject(e);
    }
  }

  // -- INSERT --
  async insert(payload) {
    return apiFetch(`/db/${this._table}`, {
      method: 'POST',
      body: JSON.stringify(Array.isArray(payload) ? payload : [payload]),
    });
  }

  // -- UPDATE --
  update(payload) {
    this._updatePayload = payload;
    return {
      eq: (col, val) => apiFetch(`/db/${this._table}`, {
        method: 'PATCH',
        body: JSON.stringify({ filters: [{ op: 'eq', col, val }], payload }),
      }),
      is: (col, val) => apiFetch(`/db/${this._table}`, {
        method: 'PATCH',
        body: JSON.stringify({ filters: [{ op: 'is', col, val }], payload }),
      }),
      match: (match) => apiFetch(`/db/${this._table}`, {
        method: 'PATCH',
        body: JSON.stringify({ filters: Object.entries(match).map(([col,val]) => ({ op:'eq', col, val })), payload }),
      }),
    };
  }

  // -- UPSERT --
  async upsert(payload, opts = {}) {
    return apiFetch(`/db/${this._table}/upsert`, {
      method: 'POST',
      body: JSON.stringify({ payload: Array.isArray(payload) ? payload : [payload], onConflict: opts.onConflict }),
    });
  }

  // -- DELETE --
  delete() {
    return {
      eq: (col, val) => apiFetch(`/db/${this._table}`, {
        method: 'DELETE',
        body: JSON.stringify({ filters: [{ op: 'eq', col, val }] }),
      }),
    };
  }
}

// -- RPC calls --
async function rpc(fnName, params = {}) {
  return apiFetch(`/rpc/${fnName}`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// -- Auth module --
const auth = {
  async signInWithPassword({ email, password }) {
    const { data, error } = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ college_id: email.replace('@college.edu', ''), password }),
    });
    if (error) return { data: null, error };
    setToken(data.token);
    _currentUser = data.user;
    sessionStorage.setItem('cams_user', JSON.stringify(data.user));
    return { data: { user: data.user, session: { access_token: data.token } }, error: null };
  },

  async signOut() {
    clearToken();
    _currentUser = null;
    sessionStorage.removeItem('cams_user');
    return { error: null };
  },

  async getSession() {
    const token = getToken();
    if (!token) return { data: { session: null }, error: null };
    return { data: { session: { access_token: token, user: _currentUser } }, error: null };
  },

  async getUser() {
    if (_currentUser) return { data: { user: _currentUser }, error: null };
    return { data: { user: null }, error: null };
  },

  onAuthStateChange(callback) {
    // Fire immediately with current state
    const token = getToken();
    setTimeout(() => callback(token ? 'SIGNED_IN' : 'SIGNED_OUT', token ? { user: _currentUser } : null), 0);
    return { data: { subscription: { unsubscribe: () => {} } } };
  },
};

// -- Storage stub (for any leftover storage calls) --
const storage = {
  from: () => ({
    upload: async () => ({ data: null, error: { message: 'Storage not supported in D1 mode' } }),
    getPublicUrl: () => ({ data: { publicUrl: '' } }),
  }),
};

// -- Main export matching supabase-js API shape --
export const supabase = {
  from: (table) => new QueryBuilder(table),
  rpc,
  auth,
  storage,
};
