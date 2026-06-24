import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // ВАЖНО: замени 'gym-diary' на точное название твоего репозитория на GitHub
  base: '/gym-diary/',
})
