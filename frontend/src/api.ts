import { HealthResponse, Item } from './types';

const API_BASE_URL = ((import.meta as any).env?.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const REQUEST_TIMEOUT_MS = 8000;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller?.signal,
      headers: {
        Accept: 'application/json',
        ...(init?.headers || {}),
      },
    });
    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  } finally {
    if (timer !== null) window.clearTimeout(timer);
  }
}

export async function checkHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>(`${API_BASE_URL}/api/health`);
}

export async function fetchItems(): Promise<Item[]> {
  return fetchJson<Item[]>(`${API_BASE_URL}/api/v1/items`);
}

export async function createItem(item: { title: string; description?: string }): Promise<Item> {
  return fetchJson<Item>(`${API_BASE_URL}/api/v1/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: item.title.trim().slice(0, 100),
      description: item.description?.trim().slice(0, 500),
    }),
  });
}

export async function toggleItem(id: number): Promise<Item> {
  const safeId = Math.max(1, Math.floor(Number(id)));
  return fetchJson<Item>(`${API_BASE_URL}/api/v1/items/${safeId}/toggle`, {
    method: 'PATCH',
  });
}

export async function deleteItem(id: number): Promise<void> {
  const safeId = Math.max(1, Math.floor(Number(id)));
  await fetchJson<void>(`${API_BASE_URL}/api/v1/items/${safeId}`, {
    method: 'DELETE',
  });
}

