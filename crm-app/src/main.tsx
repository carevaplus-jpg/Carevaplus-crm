import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { setupServiceWorker } from './lib/pwa'
import { setupNativeShell } from './lib/native'

setupServiceWorker()
setupNativeShell()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
