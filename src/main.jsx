import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { watchSystemTheme } from './utils/theme.js'
import './index.css'

// The initial theme is set by the inline script in index.html; this only keeps
// it in sync with the OS while the preference is "Sistema".
watchSystemTheme()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
