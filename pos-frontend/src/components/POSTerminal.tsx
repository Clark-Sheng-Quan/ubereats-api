import { useEffect, useState } from 'react'
import { useOrders } from '../context/OrderContext'
import { orderService } from '../services/orderService'
import { OrderList } from './OrderList'
import { OrderDetails } from './OrderDetails'
import type { Order } from '../context/OrderContext'

export function POSTerminal() {
  const { orders, selectedOrder, setSelectedOrder, addOrder, updateOrder, removeOrder } = useOrders()
  const [isLoading, setIsLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected')
  const pollingInterval = import.meta.env.VITE_POLLING_INTERVAL ? parseInt(import.meta.env.VITE_POLLING_INTERVAL) : 5000

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const fetchedOrders = await orderService.fetchPendingOrders()
        
        if (fetchedOrders.length > 0) {
          setConnectionStatus('connected')
          
          // Add or update orders
          fetchedOrders.forEach((order: Order) => {
            const existingOrder = orders.find(o => o.id === order.id)
            if (existingOrder) {
              updateOrder(order)
            } else {
              addOrder(order)
            }
          })
        } else {
          setConnectionStatus('connected')
        }
      } catch (error) {
        console.error('[POSTerminal] Error fetching orders:', error)
        setConnectionStatus('disconnected')
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrders()
    const interval = setInterval(fetchOrders, pollingInterval)
    return () => clearInterval(interval)
  }, [addOrder, updateOrder, orders])

  return (
    <div className="h-screen w-screen bg-gray-100 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">POS Terminal</h1>
            <p className="text-sm text-gray-600">Order Management System</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
            </div>
            <div className={`h-3 w-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
        </div>
      </header>

      {/* Loading State */}
      {isLoading && (
        <div className="h-[calc(100vh-80px)] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading orders...</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!isLoading && (
        <div className="flex h-[calc(100vh-80px)]">
          <OrderList
            orders={orders}
            selectedOrder={selectedOrder}
            onSelectOrder={setSelectedOrder}
          />
          <OrderDetails
            order={selectedOrder}
            onOrderUpdate={updateOrder}
            onOrderRemove={removeOrder}
          />
        </div>
      )}
    </div>
  )
}
