import { HealthResponse, Item } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchItems(): Promise<Item[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/items`);
  if (!response.ok) {
    throw new Error(`Failed to fetch items: ${response.statusText}`);
  }
  return response.json();
}

export async function createItem(item: { title: string; description?: string }): Promise<Item> {
  const response = await fetch(`${API_BASE_URL}/api/v1/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(item),
  });
  if (!response.ok) {
    throw new Error(`Failed to create item: ${response.statusText}`);
  }
  return response.json();
}

export async function toggleItem(id: number): Promise<Item> {
  const response = await fetch(`${API_BASE_URL}/api/v1/items/${id}/toggle`, {
    method: 'PATCH',
  });
  if (!response.ok) {
    throw new Error(`Failed to toggle item: ${response.statusText}`);
  }
  return response.json();
}

export async function deleteItem(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/items/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete item: ${response.statusText}`);
  }
}

