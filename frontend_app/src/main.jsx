// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
// NO necesitas importar BrowserRouter aquí si ya está en App.jsx (en Root)
import Root from './App'; 
import './index.css';   

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root /> {/* Renderiza Root directamente. Root ya contiene el BrowserRouter. */}
  </React.StrictMode>
);
