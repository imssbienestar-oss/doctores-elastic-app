// src/contexts/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; // Importa la librería

// Si usas React Router para redireccionar después del login/logout, puedes necesitar esto:
// import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('authToken'));
    // currentUser almacenará el objeto de usuario decodificado del token
    const [currentUser, setCurrentUser] = useState(null); // Inicializa como null
    const [isGuestMode, setIsGuestMode] = useState(false);
    // const navigate = useNavigate(); // Descomenta si lo necesitas

    useEffect(() => {
        const storedToken = localStorage.getItem('authToken');

        if (storedToken) {
            try {
                const decodedUser = jwtDecode(storedToken); // Decodifica el token

                //console.log("AuthContext - Token Decodificado:", decodedUser);

                setCurrentUser({
                    username: decodedUser.sub || decodedUser.username || decodedUser.name, // Esto parece funcionar para ti
                    role: decodedUser.role, // <--- ¡¡¡AJUSTA ESTO!!!
                    id: decodedUser.userId,       // <--- ¡¡¡Y ESTO!!!
                    // Agrega cualquier otra información del usuario que esté en el token y necesites:
                    // email: decodedUser.email, // Ejemplo
                });
                setIsGuestMode(false);

            } catch (error) {
                console.error("AuthContext - Token inválido o expirado al cargar:", error);
                // Si el token es inválido, limpiamos todo para evitar un estado inconsistente
                localStorage.removeItem('authToken');
                setToken(null);
                setCurrentUser(null); // Asegúrate de limpiar currentUser
                setIsGuestMode(false);
            }
        } else {
            // Si no hay token al cargar, asegúrate que currentUser sea null
            setCurrentUser(null);
            // No necesariamente activamos isGuestMode aquí, podría ser una acción explícita del usuario
        }
    }, [token]); // Se ejecuta cuando el componente se monta si hay un token,
                 // y cada vez que el estado 'token' cambie.

    const login = (newToken, userDataFromLoginPage) => {
        // userDataFromLoginPage es opcional y podría no ser necesario si toda la info está en el token.
        // La práctica más robusta es que el token sea la fuente de verdad.
        localStorage.setItem('authToken', newToken);
        setToken(newToken); // Esto cambiará el estado 'token' y disparará el useEffect de arriba,
                           // que decodificará el nuevo token y actualizará currentUser.
        setIsGuestMode(false);
        // Si necesitas que currentUser se actualice INMEDIATAMENTE sin esperar al useEffect
        // Y userDataFromLoginPage contiene la info completa (incluido el rol):
        // if (userDataFromLoginPage && userDataFromLoginPage.role) {
        //    setCurrentUser(userDataFromLoginPage);
        // }
        // else if (newToken) { // Decodificar aquí si es urgente, pero el useEffect ya lo hará
        //    try {
        //        const decoded = jwtDecode(newToken);
        //        console.log("AuthContext - Token Decodificado en LOGIN:", decoded);
        //        setCurrentUser({
        //            username: decoded.sub || decoded.username || decoded.name,
        //            role: decoded.nombre_del_campo_rol_en_tu_token, // <--- ¡¡¡AJUSTA ESTO!!!
        //            id: decoded.nombre_del_campo_id_en_tu_token,       // <--- ¡¡¡Y ESTO!!!
        //        });
        //    } catch (e) { console.error("Error decodificando token en login", e); setCurrentUser(null); }
        // }
    };

    const logout = () => {
        localStorage.removeItem('authToken');
        setToken(null);
        setCurrentUser(null); // Muy importante limpiar currentUser
        setIsGuestMode(false);
        // navigate('/login'); // Ejemplo de redirección si la usas
    };

    const enterGuestMode = () => {
        localStorage.removeItem('authToken'); // Asegurarse que no haya token de usuario
        setToken(null);
        setCurrentUser(null);
        setIsGuestMode(true);
        // navigate('/'); // O a la página principal
    };

    // isAuthenticated ahora depende DIRECTAMENTE de si currentUser tiene datos (después de decodificar un token válido)
    // y no estamos en modo invitado.
    const isAuthenticated = !!currentUser && !isGuestMode;

    const value = {
        token,           // El token JWT crudo
        currentUser,     // El objeto de usuario con { username, role, id, ... }
        isAuthenticated, // Booleano que indica si el usuario está autenticado
        isGuestMode,     // Booleano para el modo invitado
        login,           // Función para iniciar sesión
        logout,          // Función para cerrar sesión
        enterGuestMode,  // Función para entrar en modo invitado
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        // Este error significa que estás usando useAuth fuera de un componente
        // que es hijo del AuthProvider. Asegúrate que tu App.js (o similar)
        // esté envuelto por <AuthProvider>.
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};
