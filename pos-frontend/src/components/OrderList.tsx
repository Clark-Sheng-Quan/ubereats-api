import { useState } from 'react'
import type { Order } from '../context/OrderContext'

interface OrderListProps {
  orders: Order[]
  selectedOrder: Order | null
  onSelectOrder: (order: Order) => void
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800'
    case 'accepted':
      return 'bg-blue-100 text-blue-800'
    case 'preparing':
      return 'bg-purple-100 text-purple-800'
    case 'completed':
      return 'bg-green-100 text-green-800'
    case 'rejected':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function getStatusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function OrderList({ orders, selectedOrder, onSelectOrder }: OrderListProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredOrders = orders.filter(order =>
    order.orderNumber.includes(searchTerm) ||
    order.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="w-full lg:w-1/3 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Orders</h2>
        <input
          type="text"
          placeholder="Search by order # or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-sm">No orders available</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <button
              key={order.id}
              onClick={() => onSelectOrder(order)}
              className={`w-full px-4 py-3 border-b border-gray-100 text-left transition-colors hover:bg-gray-50 ${
                selectedOrder?.id === order.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                  <p className="text-sm text-gray-600">{order.customerName}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-gray-500">{order.items.length} items</span>
                <span className="font-bold text-green-600">${order.totalPrice.toFixed(2)}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
