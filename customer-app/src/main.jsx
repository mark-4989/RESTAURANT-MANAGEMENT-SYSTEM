import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App.jsx'
import './styles/light-theme.css';
// DON'T import index.css - we use styles folder instead

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

console.log('🔑 Clerk Key:', PUBLISHABLE_KEY ? 'Found!' : 'Missing!');
console.log('🌐 API URL:', import.meta.env.VITE_API_URL);

if (!PUBLISHABLE_KEY) {
  console.error('❌ Add VITE_CLERK_PUBLISHABLE_KEY to .env file');
  throw new Error('Missing Clerk Publishable Key. Please add VITE_CLERK_PUBLISHABLE_KEY to your .env file');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </StrictMode>,
)