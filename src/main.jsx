import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { Buffer } from 'buffer'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { GoogleOAuthProvider } from '@react-oauth/google'

window.Buffer = Buffer; // Important for the encryption to work!

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
if (!googleClientId) {
  console.warn('VITE_GOOGLE_CLIENT_ID is missing; Google login will not work until it is configured.')
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <GoogleOAuthProvider clientId={googleClientId ?? ''}>
      <App />
      <Toaster position="top-right" richColors />
    </GoogleOAuthProvider>
  </QueryClientProvider>,
)