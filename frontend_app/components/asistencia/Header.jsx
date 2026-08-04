import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { COLORS } from './constants'; // Importamos tus colores centralizados

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="shadow-md sticky top-0 z-50 bg-white">
      {/* Barra Superior: Gobierno */}
      <div className="py-2 px-4" style={{ backgroundColor: COLORS.guinda }}>
        <div className="container mx-auto flex items-center gap-3">
          <img
            src="/fotos/gobierno.png"
            alt="Escudo"
            className="h-10 md:h-12 object-contain" 
          />
        </div>
      </div>

      {/* Barra Principal: IMSS Bienestar */}
      <div className="relative" style={{ backgroundColor: COLORS.verde }}>
        <div className="absolute top-0 right-0 w-64 h-full opacity-10 bg-white transform skew-x-12 pointer-events-none"></div>

        <div className="container mx-auto px-4 py-3 relative z-10">
          <div className="flex items-center justify-between">
            {/* LOGO */}
            <Link to="/" className="flex items-center gap-4 group">
              <img
                src="/fotos/imss-bienestar-blanco.png"
                alt="IMSS Bienestar"
                className="h-10 md:h-12 w-auto object-contain border-r border-white/20 pr-4 mr-2 hidden sm:block"
              />
              <div>
                <h2 className="text-white text-sm md:text-lg font-light opacity-90">Sistema Orientación Institucional</h2>
                <p style={{ color: COLORS.dorado }} className="text-xs">Servicios Públicos de Salud</p> 
              </div>
            </Link>

            {/* MENÚ PC */}
            <nav className="hidden md:flex items-center gap-3">
              <NavLink to="/" className={({ isActive }) => `px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition-all border ${isActive ? 'bg-white shadow-md' : 'text-white border-transparent hover:bg-white/10'}`} style={({ isActive }) => isActive ? { color: COLORS.verde, borderColor: 'white' } : {}}>
                Inicio
              </NavLink>
            </nav>

            {/* BOTÓN HAMBURGUESA MOVIL */}
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-white p-2 rounded-md hover:bg-white/10 transition-colors focus:outline-none">
              {isMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
              )}
            </button>
          </div>

          {/* MENÚ DESPLEGABLE MOVIL */}
          {isMenuOpen && (
            <div className="md:hidden mt-4 pt-4 border-t border-white/10 flex flex-col gap-2 pb-2 animate-fade-in-down">
              <NavLink to="/" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `block w-full text-center px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all ${isActive ? 'bg-white shadow-md' : 'text-white hover:bg-white/10'}`} style={({ isActive }) => isActive ? { color: COLORS.verde } : { backgroundColor: 'rgba(255,255,255,0.05)' }}>
                Inicio
              </NavLink>
            </div>
          )}
        </div>
      </div>
      <div className="h-1 w-full" style={{ backgroundColor: COLORS.dorado }}></div>
    </header>
  );
};

export default Header;