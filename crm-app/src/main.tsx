import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter/opsz.css'
import '@fontsource/lexend/500.css'
import '@fontsource/lexend/600.css'
import '@fontsource/lexend/700.css'
import '@fontsource/lexend/800.css'
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
