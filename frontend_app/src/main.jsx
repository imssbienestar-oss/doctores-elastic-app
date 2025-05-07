// src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // Importar BrowserRouter
import { AuthProvider } from './contexts/AuthContext'; // Asegúrate que la ruta a tu AuthContext sea correcta
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter> {/* Envolver con BrowserRouter para habilitar el enrutamiento */}
      <AuthProvider> {/* Envolver con AuthProvider para proveer el contexto de autenticación */}
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
