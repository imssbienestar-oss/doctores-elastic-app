// src/contexts/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect,useCallback  } from "react";
import { jwtDecode } from "jwt-decode"; // Importa la librería

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("authToken"));
  // currentUser almacenará el objeto de usuario decodificado del token
  const [currentUser, setCurrentUser] = useState(null);
  const [isGuestMode, setIsGuestMode] = useState(false);

  const [dataRefreshKey, setDataRefreshKey] = useState(0);
  const triggerDataRefresh = useCallback(() => {
    setDataRefreshKey((prevKey) => prevKey + 1);
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem("authToken");

    if (storedToken) {
      try {
        const decodedUser = jwtDecode(storedToken);

        setCurrentUser({
          username: decodedUser.sub || decodedUser.username || decodedUser.name, // Esto parece funcionar para ti
          role: decodedUser.role,
          id: decodedUser.userId,
        });
        setIsGuestMode(false);
      } catch (error) {
        console.error(
          "AuthContext - Token inválido o expirado al cargar:",
          error
        );

        localStorage.removeItem("authToken");
        setToken(null);
        setCurrentUser(null);
        setIsGuestMode(false);
      }
    } else {
      setCurrentUser(null);
    }
  }, [token]);

  const login = (newToken, userDataFromLoginPage) => {
    localStorage.setItem("authToken", newToken);
    setToken(newToken);
    setIsGuestMode(false);
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setToken(null);
    setCurrentUser(null);
    setIsGuestMode(false);
  };

  const enterGuestMode = () => {
    localStorage.removeItem("authToken");
    setCurrentUser(null);
    setIsGuestMode(true);
  };
  const isAuthenticated = !!currentUser && !isGuestMode;

  const value = {
    token,
    currentUser,
    isAuthenticated, // Booleano que indica si el usuario está autenticado
    isGuestMode, // Booleano para el modo invitado
    login, // Función para iniciar sesión
    logout, // Función para cerrar sesión
    enterGuestMode, // Función para entrar en modo invitado
    triggerDataRefresh,
    dataRefreshKey, // El estado del timbre
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
};
