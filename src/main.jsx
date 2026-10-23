import React from 'react'
import ReactDOM from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import App from './App.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'
import { watchSystemTheme } from './utils/theme.js'
import { MOCK_MODE } from './mock/mode.js'
import { seedMockData } from './mock/data.js'
import './index.css'

// The initial theme is set by the inline script in index.html; this only keeps
// it in sync with the OS while the preference is "Sistema".
watchSystemTheme()

// Demo mode (non-production deploys): sample data in place of the Google login.
if (MOCK_MODE) seedMockData()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
    <Analytics />
  </React.StrictMode>
)
