const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const LOCAL_API = `${API_BASE_URL}/api/local`
const ORDER_API = `${API_BASE_URL}/api/order`

interface FetchOptions extends RequestInit {
  timeout?: number
}

async function fetchWithTimeout(url: string, options: FetchOptions = {}) {
  const { timeout = 30000, ...fetchOptions } = options
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

export const orderService = {
  async fetchPendingOrders() {
    try {
      const response = await fetchWithTimeout(`${LOCAL_API}/orders?status=pending&limit=50`)
      if (response.ok) {
        const data = await response.json()
        return data.orders || []
      }
      return []
    } catch (error) {
      console.error('[orderService] Error fetching orders:', error)
      return []
    }
  },

  async acceptOrder(orderId: string) {
    try {
      const response = await fetchWithTimeout(`${ORDER_API}/orders/${orderId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      
      if (response.ok) {
        console.log('[orderService] Order accepted:', orderId)
        return { success: true }
      }
      
      const error = await response.text()
      console.error('[orderService] Failed to accept order:', error)
      return { success: false, error }
    } catch (error) {
      console.error('[orderService] Error accepting order:', error)
      return { success: false, error: String(error) }
    }
  },

  async rejectOrder(orderId: string, reason: string) {
    try {
      const response = await fetchWithTimeout(`${ORDER_API}/orders/${orderId}/deny`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      
      if (response.ok) {
        console.log('[orderService] Order rejected:', orderId)
        return { success: true }
      }
      
      const error = await response.text()
      console.error('[orderService] Failed to reject order:', error)
      return { success: false, error }
    } catch (error) {
      console.error('[orderService] Error rejecting order:', error)
      return { success: false, error: String(error) }
    }
  },

  async updateOrderStatus(orderId: string, status: string) {
    try {
      const response = await fetchWithTimeout(`${ORDER_API}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      
      if (response.ok) {
        console.log('[orderService] Order status updated:', orderId, status)
        return { success: true }
      }
      
      const error = await response.text()
      console.error('[orderService] Failed to update order status:', error)
      return { success: false, error }
    } catch (error) {
      console.error('[orderService] Error updating order status:', error)
      return { success: false, error: String(error) }
    }
  },
}
