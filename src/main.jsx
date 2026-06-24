import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Говорим Telegram что приложение готово
if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.ready()
  window.Telegram.WebApp.expand() // раскрываем на весь экран
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
