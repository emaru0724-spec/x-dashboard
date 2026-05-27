const BASE = '/api';

async function request<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
    ...opts,
  });
  const json = await res.json() as { success: boolean; data?: T; error?: string };
  if (!json.success) throw new Error(json.error ?? 'Unknown error');
  return json.data as T;
}

function qs(params?: Record<string, string | undefined>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '') as [string, string][];
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}

// --- Accounts ---
export const accounts = {
  list: () => request<any[]>('/accounts'),
  get: (id: string) => request<any>(`/accounts/${id}`),
  create: (data: any) => request<any>('/accounts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/accounts/${id}`, { method: 'DELETE' }),
  seed: () => request<any>('/accounts/seed', { method: 'POST' }),
};

// --- Posts ---
export const posts = {
  list: (filters?: { status?: string; post_type?: string; genre?: string; hook_type?: string; accountId?: string }) =>
    request<any[]>(`/posts${qs(filters)}`),
  get: (id: string) => request<any>(`/posts/${id}`),
  create: (data: any) => request<any>('/posts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/posts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStatus: (id: string, status: string) =>
    request<any>(`/posts/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  delete: (id: string) => request<any>(`/posts/${id}`, { method: 'DELETE' }),
};

// --- Knowledge ---
export const knowledge = {
  list: (filters?: { genre?: string; confidence?: string; search?: string; is_archived?: string; accountId?: string }) =>
    request<any[]>(`/knowledge${qs(filters)}`),
  get: (id: string) => request<any>(`/knowledge/${id}`),
  create: (data: any) => request<any>('/knowledge', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/knowledge/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/knowledge/${id}`, { method: 'DELETE' }),
  archiveExpired: () => request<any>('/knowledge/archive-expired', { method: 'POST' }),
};

// --- Feedback ---
export const feedback = {
  list: (filters?: { status?: string; urgency?: string; accountId?: string }) =>
    request<any[]>(`/feedback${qs(filters)}`),
  create: (data: any) => request<any>('/feedback', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/feedback/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  resolve: (id: string) => request<any>(`/feedback/${id}/resolve`, { method: 'PATCH' }),
};

// --- Engagement ---
export const engagement = {
  list: (filters?: { tier?: string; priority?: string; accountId?: string }) =>
    request<any[]>(`/engagement${qs(filters)}`),
  create: (data: any) => request<any>('/engagement', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/engagement/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/engagement/${id}`, { method: 'DELETE' }),
};

// --- Performance ---
export const performance = {
  list: (filters?: { judgment?: string; check_type?: string; accountId?: string }) =>
    request<any[]>(`/performance${qs(filters)}`),
  create: (data: any) => request<any>('/performance', { method: 'POST', body: JSON.stringify(data) }),
  summary: (accountId?: string) => request<any>(`/performance/summary${qs({ accountId })}`),
};

// --- Competitors ---
export const competitors = {
  list: (accountId?: string) => request<any[]>(`/competitors${qs({ accountId })}`),
  create: (data: any) => request<any>('/competitors', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/competitors/${id}`, { method: 'DELETE' }),
};

// --- Stats ---
export const stats = {
  daily: (accountId?: string) => request<any>(`/stats/daily${qs({ accountId })}`),
  weekly: (accountId?: string) => request<any>(`/stats/weekly${qs({ accountId })}`),
  pendingFeedback: (accountId?: string) => request<any>(`/stats/pending-feedback${qs({ accountId })}`),
};

// --- AI ---
export const ai = {
  generatePost: (data: any) => request<any>('/ai/generate-post', { method: 'POST', body: JSON.stringify(data) }),
  qualityCheck: (body: string, accountId?: string) =>
    request<any>('/ai/quality-check', { method: 'POST', body: JSON.stringify({ body, accountId }) }),
};

const api = { accounts, posts, knowledge, feedback, engagement, performance, competitors, stats, ai };
export default api;
