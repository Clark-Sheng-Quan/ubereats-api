import './index.css'
import { OrderProvider } from './context/OrderContext'
import { POSTerminal } from './components/POSTerminal'

function App() {
  return (
    <OrderProvider>
      <POSTerminal />
    </OrderProvider>
  )
}

export default App
