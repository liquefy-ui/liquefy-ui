import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@liquefy-ui/react/styles.css'
import './styles.css'
import { App } from './app'

const root = document.getElementById('root')
if (!root) throw new Error('Root element was not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
