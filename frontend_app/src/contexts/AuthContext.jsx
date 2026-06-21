// src/contexts/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext(null);

const getUserFromToken = (tokenValue) => {
  if (!tokenValue) return null;
  try {
    const decodedUser = jwtDecode(tokenValue);
    return {
      username: decodedUser.sub || decodedUser.username || decodedUser.name,
      role: decodedUser.role,
      id: decodedUser.userId,
    };
  } catch (error) {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("authToken"));
  const [currentUser, setCurrentUser] = useState(() => getUserFromToken(localStorage.getItem("authToken")));
  const [isGuestMode, setIsGuestMode] = useState(false);

  const [dataRefreshKey, setDataRefreshKey] = useState(0);
  const triggerDataRefresh = useCallback(() => {
    setDataRefreshKey((prevKey) => prevKey + 1);
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem("authToken");
    if (storedToken) {
      const user = getUserFromToken(storedToken);
      if (!user) {
        console.error("AuthContext - Token inválido o expirado al cargar");
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
    setCurrentUser(getUserFromToken(newToken)); // Actualizamos síncronamente al loguear
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
    setToken(null);
    setCurrentUser(null);
    setIsGuestMode(true);
  };
  
  const isAuthenticated = !!currentUser && !isGuestMode;

  const value = {
    token,
    currentUser,
    isAuthenticated,
    isGuestMode,
    login,
    logout,
    enterGuestMode,
    triggerDataRefresh,
    dataRefreshKey,
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
