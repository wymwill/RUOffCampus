import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { FavoritesProvider } from './context/FavoritesContext.jsx'
import { ListingsProvider } from './context/ListingsContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { FiltersProvider } from './context/FiltersContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ListingsProvider>
        <FavoritesProvider>
          <FiltersProvider>
            <App />
          </FiltersProvider>
        </FavoritesProvider>
      </ListingsProvider>
    </AuthProvider>
  </StrictMode>,
)
