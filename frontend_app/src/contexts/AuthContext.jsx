// src/contexts/AuthContext.jsx (Ejemplo con Context API)
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Si usas React Router

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('authToken'));
    const [currentUser, setCurrentUser] = useState(null); // Podrías guardar datos del usuario
    const [isGuestMode, setIsGuestMode] = useState(false);
    // const navigate = useNavigate(); // Descomenta si usas React Router y lo necesitas aquí

    useEffect(() => {
        // Si hay un token, podrías querer validar/refrescar info del usuario
        // Por ahora, solo nos basamos en la existencia del token para `isAuthenticated`
        if (token) {
            setIsGuestMode(false);
            // Opcional: podrías querer decodificar el token para obtener info básica del usuario
            // o hacer una llamada a un endpoint /api/users/me
        }
    }, [token]);

    const login = (newToken, userData) => {
        localStorage.setItem('authToken', newToken);
        setToken(newToken);
        setCurrentUser(userData); // Opcional
        setIsGuestMode(false);
    };

    const logout = () => {
        localStorage.removeItem('authToken');
        setToken(null);
        setCurrentUser(null);
        setIsGuestMode(false); // Al hacer logout, no es invitado, usualmente va a login
        // navigate('/login'); // Ejemplo de redirección
    };

    const enterGuestMode = () => {
        localStorage.removeItem('authToken'); // Asegurarse que no haya token
        setToken(null);
        setCurrentUser(null);
        setIsGuestMode(true);
        // navigate('/'); // O a la página principal de la tabla
    };

    const isAuthenticated = !!token && !isGuestMode;

    const value = {
        token,
        currentUser,
        isAuthenticated,
        isGuestMode,
        login,
        logout,
        enterGuestMode,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};