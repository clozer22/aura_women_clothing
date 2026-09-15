import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initSecurityConsole } from './lib/securityConsole'

// Initialize DevTools security & WEBUILDWEB OFFICIAL protection
initSecurityConsole();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
