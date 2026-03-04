import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { esES } from '@clerk/localizations'
import ClerkTokenProvider from './components/ClerkTokenProvider.jsx'
import App from './App.jsx'
import { ThemeCtxProvider } from './contexts/theme-ctx.jsx'

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('VITE_CLERK_PUBLISHABLE_KEY no está configurada')
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} localization={esES}>
      <ClerkTokenProvider>
        <ThemeCtxProvider>
          <App />
        </ThemeCtxProvider>
      </ClerkTokenProvider>
    </ClerkProvider>
  </React.StrictMode>,
)
