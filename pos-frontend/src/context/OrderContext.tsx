import React, { createContext, useContext, useState, useCallback } from 'react'

interface Order {
  id: string
  orderNumber: string
  customerId: string
  customerName: string
  items: OrderItem[]
  totalPrice: number
  specialInstructions: string
  status: 'pending' | 'accepted' | 'preparing' | 'completed' | 'rejected'
  createdAt: string
  notes: string
}

interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
  notes: string
}

interface OrderContextType {
  orders: Order[]
  selectedOrder: Order | null
  setSelectedOrder: (order: Order | null) => void
  addOrder: (order: Order) => void
  updateOrder: (order: Order) => void
  removeOrder: (orderId: string) => void
}

const OrderContext = createContext<OrderContextType | undefined>(undefined)

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const addOrder = useCallback((order: Order) => {
    setOrders(prev => [order, ...prev])
  }, [])

  const updateOrder = useCallback((order: Order) => {
    setOrders(prev => prev.map(o => o.id === order.id ? order : o))
    if (selectedOrder?.id === order.id) {
      setSelectedOrder(order)
    }
  }, [selectedOrder?.id])

  const removeOrder = useCallback((orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId))
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(null)
    }
  }, [selectedOrder?.id])

  return (
    <OrderContext.Provider value={{ orders, selectedOrder, setSelectedOrder, addOrder, updateOrder, removeOrder }}>
      {children}
    </OrderContext.Provider>
  )
}

export function useOrders() {
  const context = useContext(OrderContext)
  if (context === undefined) {
    throw new Error('useOrders must be used within OrderProvider')
  }
  return context
}

export type { Order, OrderItem }
