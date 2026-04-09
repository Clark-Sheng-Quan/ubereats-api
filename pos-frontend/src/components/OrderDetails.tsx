import { useState } from 'react'
import type { Order } from '../context/OrderContext'
import { orderService } from '../services/orderService'

interface OrderDetailsProps {
  order: Order | null
  onOrderUpdate: (order: Order) => void
  onOrderRemove: (orderId: string) => void
}

export function OrderDetails({ order, onOrderUpdate, onOrderRemove }: OrderDetailsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  if (!order) {
    return (
      <div className="flex-1 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Select an order to view details</p>
        </div>
      </div>
    )
  }

  const clearMessages = () => {
    setError(null)
    setSuccessMessage(null)
  }

  const handleAccept = async () => {
    clearMessages()
    setIsLoading(true)
    
    const result = await orderService.acceptOrder(order.id)
    
    if (result.success) {
      setSuccessMessage('Order accepted successfully')
      onOrderUpdate({ ...order, status: 'accepted' })
      setTimeout(() => setSuccessMessage(null), 3000)
    } else {
      setError(result.error || 'Failed to accept order')
    }
    
    setIsLoading(false)
  }

  const handleReject = async () => {
    clearMessages()
    const reason = window.prompt('Please provide a reason for rejection:')
    if (!reason) return

    setIsLoading(true)
    
    const result = await orderService.rejectOrder(order.id, reason)
    
    if (result.success) {
      setSuccessMessage('Order rejected')
      onOrderRemove(order.id)
      setTimeout(() => setSuccessMessage(null), 2000)
    } else {
      setError(result.error || 'Failed to reject order')
    }
    
    setIsLoading(false)
  }

  const handleMarkPreparing = async () => {
    clearMessages()
    setIsLoading(true)
    
    const result = await orderService.updateOrderStatus(order.id, 'preparing')
    
    if (result.success) {
      setSuccessMessage('Order marked as preparing')
      onOrderUpdate({ ...order, status: 'preparing' })
      setTimeout(() => setSuccessMessage(null), 2000)
    } else {
      setError(result.error || 'Failed to update order')
    }
    
    setIsLoading(false)
  }

  const handleMarkCompleted = async () => {
    clearMessages()
    setIsLoading(true)
    
    const result = await orderService.updateOrderStatus(order.id, 'completed')
    
    if (result.success) {
      setSuccessMessage('Order marked as completed')
      onOrderUpdate({ ...order, status: 'completed' })
      setTimeout(() => setSuccessMessage(null), 2000)
    } else {
      setError(result.error || 'Failed to update order')
    }
    
    setIsLoading(false)
  }

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      <div className="p-6 max-w-4xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{order.orderNumber}</h1>
              <p className="text-gray-600 mt-1">{order.customerName}</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-500">
            Order placed: {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 text-sm">{successMessage}</p>
          </div>
        )}

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Order Items</h2>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between border-b border-gray-100 pb-3 last:border-0">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  {item.notes && <p className="text-sm text-gray-600">{item.notes}</p>}
                </div>
                <div className="text-right ml-4">
                  <p className="font-semibold text-gray-900">x{item.quantity}</p>
                  <p className="text-sm text-gray-600">${item.price.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
            <span className="text-gray-700 font-semibold">Total:</span>
            <span className="text-2xl font-bold text-green-600">${order.totalPrice.toFixed(2)}</span>
          </div>
        </div>

        {/* Special Instructions */}
        {order.specialInstructions && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Special Instructions</h2>
            <p className="text-gray-700 text-sm leading-relaxed">{order.specialInstructions}</p>
          </div>
        )}

        {/* Notes */}
        {order.notes && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-900 text-sm"><strong>Internal Notes:</strong> {order.notes}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {order.status === 'pending' && (
            <>
              <button
                onClick={handleAccept}
                disabled={isLoading}
                className="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition"
              >
                {isLoading ? 'Processing...' : 'Accept Order'}
              </button>
              <button
                onClick={handleReject}
                disabled={isLoading}
                className="px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition"
              >
                {isLoading ? 'Processing...' : 'Reject Order'}
              </button>
            </>
          )}

          {order.status === 'accepted' && (
            <button
              onClick={handleMarkPreparing}
              disabled={isLoading}
              className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition col-span-2 md:col-span-1"
            >
              {isLoading ? 'Processing...' : 'Mark Preparing'}
            </button>
          )}

          {order.status === 'preparing' && (
            <button
              onClick={handleMarkCompleted}
              disabled={isLoading}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition col-span-2 md:col-span-1"
            >
              {isLoading ? 'Processing...' : 'Mark Ready'}
            </button>
          )}

          {order.status === 'completed' && (
            <div className="col-span-2 md:col-span-4 px-4 py-3 bg-green-100 border border-green-300 rounded-lg text-center">
              <p className="text-green-800 font-medium">✓ Order Completed</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
