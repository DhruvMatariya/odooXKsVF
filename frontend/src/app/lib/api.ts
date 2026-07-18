const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';

interface ApiResponse<T = any> {
  statusCode: number;
  message: string;
  data?: T;
  success?: boolean;
}

// Helper to get tokens from localStorage
export function getTokens() {
  return {
    accessToken: localStorage.getItem('rentsure_access_token'),
    refreshToken: localStorage.getItem('rentsure_refresh_token'),
  };
}

// Helper to set tokens
export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('rentsure_access_token', accessToken);
  localStorage.setItem('rentsure_refresh_token', refreshToken);
}

// Helper to clear tokens
export function clearTokens() {
  localStorage.removeItem('rentsure_access_token');
  localStorage.removeItem('rentsure_refresh_token');
  localStorage.removeItem('rentsure_user');
}

// Fetch wrapper with auth
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const { accessToken } = getTokens();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Don't set Content-Type if it's FormData (multipart/form-data with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

// API Functions
export async function getCategories() {
  return apiFetch('/categories');
}

export async function listProducts(query: any) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  return apiFetch(`/products?${params.toString()}`);
}

export async function getProductById(id: string) {
  return apiFetch(`/products/${id}`);
}

export async function createProduct(formData: FormData) {
  return apiFetch('/products', {
    method: 'POST',
    body: formData,
  });
}

export async function updateProduct(id: string, formData: FormData) {
  return apiFetch(`/products/${id}`, {
    method: 'PATCH',
    body: formData,
  });
}

export async function deleteProduct(id: string) {
  return apiFetch(`/products/${id}`, {
    method: 'DELETE',
  });
}

export async function getInventory(id: string) {
  return apiFetch(`/products/${id}/inventory`);
}

export async function updateInventory(id: string, data: any) {
  return apiFetch(`/products/${id}/inventory`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getPricing(id: string) {
  return apiFetch(`/products/${id}/pricing`);
}

export async function createPricing(productId: string, data: any) {
  return apiFetch(`/products/${productId}/pricing`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePricing(pricingId: string, data: any) {
  return apiFetch(`/pricing/${pricingId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deletePricing(pricingId: string) {
  return apiFetch(`/pricing/${pricingId}`, {
    method: 'DELETE',
  });
}
