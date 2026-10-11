
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import {AppContextProvider} from './context/AppContext.jsx';
import {BrowserRouter} from 'react-router-dom';
import { ClerkProvider } from '@clerk/react'

// Import Publishable key from clerk dashboard and replace it with the below string
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Publishable Key');
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
   <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignInUrl='/'>
    <AppContextProvider>
     <App />
    </AppContextProvider>
   </ClerkProvider>
  </BrowserRouter>,
)
