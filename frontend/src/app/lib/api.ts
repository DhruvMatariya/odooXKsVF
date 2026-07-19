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
  return apiFetch('/catalog/categories');
}

export async function listProducts(query: any) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  return apiFetch(`/catalog/products/?${params.toString()}`);
}

export async function getProductById(id: string) {
  return apiFetch(`/catalog/products/${id}`);
}

export async function createProduct(formData: FormData) {
  return apiFetch('/catalog/products', {
    method: 'POST',
    body: formData,
  });
}

export async function updateProduct(id: string, formData: FormData) {
  return apiFetch(`/catalog/products/${id}`, {
    method: 'PATCH',
    body: formData,
  });
}

export async function deleteProduct(id: string) {
  return apiFetch(`/catalog/products/${id}`, {
    method: 'DELETE',
  });
}

export async function getInventory(id: string) {
  return apiFetch(`/catalog/products/${id}/inventory`);
}

export async function updateInventory(id: string, data: any) {
  return apiFetch(`/catalog/products/${id}/inventory`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getPricing(id: string) {
  return apiFetch(`/catalog/products/${id}/pricing`);
}

export async function createPricing(productId: string, data: any) {
  return apiFetch(`/catalog/products/${productId}/pricing`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePricing(pricingId: string, data: any) {
  return apiFetch(`/catalog/pricing/${pricingId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deletePricing(pricingId: string) {
  return apiFetch(`/catalog/pricing/${pricingId}`, {
    method: 'DELETE',
  });
}

export async function createReturnSlot(data: any) {
  return apiFetch('/catalog/vendor/return-slots', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getReturnSlots(date?: string) {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  return apiFetch(`/catalog/vendor/return-slots?${params.toString()}`);
}

export async function upsertLateFeeRule(data: any) {
  return apiFetch('/catalog/vendor/late-fee-rule', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function upsertCancellationPolicy(data: any) {
  return apiFetch('/catalog/vendor/cancellation-policy', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function inspectOrder(orderId: string, data: {
  damageFound: boolean;
  conditionNotes?: string;
  photos?: string[];
  damageDeductionAmount?: number;
}) {
  return apiFetch(`/orders/${orderId}/inspect`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getOrderById(id: string) {
  return apiFetch(`/orders/${id}`);
}

export async function getVendorDashboardStats() {
  return apiFetch('/vendor/dashboard-stats');
}

export interface CreateOrderData {
  productId: string;
  pricingId: string;
  quantity: number;
  channel: 'ONLINE' | 'OFFLINE';
  deliveryType: 'PICKUP' | 'DELIVERY';
  rentalPeriodStart: string;
  rentalPeriodEnd: string;
}

export interface CreateOrderResponse {
  order: {
    id: string;
    customerUserId: string;
    vendorUserId: string;
    productId: string;
    pricingId: string;
    quantity: number;
    channel: string;
    status: string;
    deliveryType: string;
    rentalPeriodStart: string;
    rentalPeriodEnd: string;
    createdAt: string;
    updatedAt: string;
  };
  razorpayOrderIdRental: string;
  razorpayOrderIdDeposit: string;
  razorpayKeyId: string;
}

export async function createOrder(data: CreateOrderData, idempotencyKey?: string) {
  const headers: Record<string, string> = {};
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }
  return apiFetch<CreateOrderResponse>('/orders', {
    method: 'POST',
    body: JSON.stringify(data),
    headers,
  });
}

export interface VerifyPaymentData {
  provider: 'razorpay';
  razorpayOrderIdRental: string;
  razorpayPaymentIdRental: string;
  razorpaySignatureRental: string;
  razorpayOrderIdDeposit: string;
  razorpayPaymentIdDeposit: string;
  razorpaySignatureDeposit: string;
}

export async function verifyPayment(orderId: string, data: VerifyPaymentData) {
  return apiFetch(`/orders/${orderId}/verify-payment`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface RetryPaymentResponse {
  order: {
    id: string;
    customerUserId: string;
    vendorUserId: string;
    productId: string;
    pricingId: string;
    quantity: number;
    channel: string;
    status: string;
    deliveryType: string;
    rentalPeriodStart: string;
    rentalPeriodEnd: string;
    createdAt: string;
    updatedAt: string;
  };
  razorpayOrderIdRental: string;
  razorpayOrderIdDeposit: string;
  razorpayKeyId: string;
}

export async function retryPayment(orderId: string) {
  return apiFetch<RetryPaymentResponse>(`/orders/${orderId}/retry-payment`, {
    method: 'POST',
  });
}

export async function listOrders(params: { status?: string; page?: number; limit?: number } = {}) {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return apiFetch(`/orders${qs ? '?' + qs : ''}`);
}
