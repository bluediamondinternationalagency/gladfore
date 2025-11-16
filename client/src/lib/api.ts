// API configuration for Supabase Edge Functions
import { supabase } from './supabaseClient'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://nuexakcydimzdrntjshi.supabase.co'

export const API_BASE_URL = `${SUPABASE_URL}/functions/v1`

export const API_ENDPOINTS = {
  adminAgents: `${API_BASE_URL}/admin-agents`,
  adminFarmers: `${API_BASE_URL}/admin-farmers`,
  adminOrders: `${API_BASE_URL}/admin-orders`,
  adminPayments: `${API_BASE_URL}/admin-payments`,
  adminStats: `${API_BASE_URL}/admin-stats`,
  adminKycPending: `${API_BASE_URL}/admin-kyc-pending`,
  adminCreateUser: `${API_BASE_URL}/admin-create-user`,
  farmerProfile: `${API_BASE_URL}/farmer-profile`,
  farmerOrders: `${API_BASE_URL}/farmer-orders`,
  farmerPayments: `${API_BASE_URL}/farmer-payments`,
  farmerNotifications: `${API_BASE_URL}/farmer-notifications`,
  farmerNotificationRead: `${API_BASE_URL}/farmer-notification-read`,
  farmerProfileUpdate: `${API_BASE_URL}/farmer-profile-update`,
  agentProfile: `${API_BASE_URL}/agent-profile`,
  agentStats: `${API_BASE_URL}/agent-stats`,
  agentFarmers: `${API_BASE_URL}/agent-farmers`,
  agentOrders: `${API_BASE_URL}/agent-orders`,
  agentPayments: `${API_BASE_URL}/agent-payments`,
  agentCommission: `${API_BASE_URL}/agent-commission`,
  agentNotifications: `${API_BASE_URL}/agent-notifications`,
  agentCreateFarmer: `${API_BASE_URL}/agent-create-farmer`,
  agentCreateOrder: `${API_BASE_URL}/agent-create-order`,
  agentRecordPayment: `${API_BASE_URL}/agent-record-payment`,
  agentProducts: `${API_BASE_URL}/agent-products`,
  adminProducts: `${API_BASE_URL}/admin-products`,
  adminOrderActions: `${API_BASE_URL}/admin-order-actions`,
  markNotificationRead: `${API_BASE_URL}/mark-notification-read`,
} as const

// Helper to get Supabase anon key for authenticated requests
export const getSupabaseHeaders = () => {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  return {
    'Content-Type': 'application/json',
    'apikey': anonKey || '',
    'Authorization': `Bearer ${anonKey || ''}`,
  }
}

// Helper to get auth token from Supabase session
export const getAuthToken = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || ''
}

// Helper to make authenticated requests
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = await getAuthToken()
  
  console.log('fetchWithAuth - URL:', url)
  console.log('fetchWithAuth - Has token:', !!token)
  
  if (!token) {
    throw new Error('Not authenticated')
  }
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getSupabaseHeaders(),
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  })
  
  console.log('fetchWithAuth - Response status:', response.status, response.statusText)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.log('fetchWithAuth - Error response:', errorText)
    let errorMessage = `API Error: ${response.status} ${response.statusText}`
    try {
      const errorData = JSON.parse(errorText)
      errorMessage = errorData.error || errorData.message || errorMessage
    } catch {
      errorMessage = errorText || errorMessage
    }
    throw new Error(errorMessage)
  }
  
  return response.json()
}

// Agent API functions
export const api = {
  // Agent Profile
  agentProfile: () => fetchWithAuth(API_ENDPOINTS.agentProfile),
  
  // Agent Stats
  agentStats: () => fetchWithAuth(API_ENDPOINTS.agentStats),
  
  // Agent Farmers
  agentFarmers: () => fetchWithAuth(API_ENDPOINTS.agentFarmers),
  
  // Agent Orders
  agentOrders: () => fetchWithAuth(API_ENDPOINTS.agentOrders),
  
  // Agent Payments
  agentPayments: () => fetchWithAuth(API_ENDPOINTS.agentPayments),
  
  // Agent Commission
  agentCommission: () => fetchWithAuth(API_ENDPOINTS.agentCommission),
  
  // Agent Notifications
  agentNotifications: () => fetchWithAuth(API_ENDPOINTS.agentNotifications),
  
  // Agent Actions
  agentCreateFarmer: (data: any) => fetchWithAuth(API_ENDPOINTS.agentCreateFarmer, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  agentCreateOrder: (data: any) => fetchWithAuth(API_ENDPOINTS.agentCreateOrder, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  agentRecordPayment: (data: any) => fetchWithAuth(API_ENDPOINTS.agentRecordPayment, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // Agent Products
  agentProducts: () => fetchWithAuth(API_ENDPOINTS.agentProducts),
  
  // Admin Products
  adminProducts: () => fetchWithAuth(API_ENDPOINTS.adminProducts),
  
  adminCreateProduct: (data: any) => fetchWithAuth(API_ENDPOINTS.adminProducts, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  adminUpdateProduct: (data: any) => fetchWithAuth(API_ENDPOINTS.adminProducts, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  adminDeleteProduct: (id: string) => fetchWithAuth(`${API_ENDPOINTS.adminProducts}?id=${id}`, {
    method: 'DELETE',
  }),
  
  // Admin Order Actions
  adminOrderAction: (data: { orderId: string; action: string; reason?: string; notes?: string }) => 
    fetchWithAuth(API_ENDPOINTS.adminOrderActions, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // Mark Notification as Read
  markNotificationRead: (data: { notificationId?: string; markAllAsRead?: boolean }) => 
    fetchWithAuth(API_ENDPOINTS.markNotificationRead, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

