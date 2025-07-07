import React, { useState } from 'react';
import { useAuth } from '../src/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function ProfilePage() {
    const { currentUser, token, logout } = useAuth();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmitPasswordChange = async (e) => {
        e.preventDefault();
        if (newPassword.length < 8) {
            setError("La nueva contraseña debe tener al menos 8 caracteres.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Las contraseñas no coinciden.");
            return;
        }

        setError('');
        setSuccess('');
        setLoading(true);

        const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
        const changePasswordUrl = `${apiUrl}/api/users/me/change-password`;

        try {
            const response = await fetch(changePasswordUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ new_password: newPassword }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || "Error al actualizar la contraseña.");
            }

            setSuccess("Contraseña actualizada con éxito. Serás desconectado por seguridad.");
            setTimeout(() => {
                logout();
                navigate('/login');
            }, 3000);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Renderiza el componente
    return (
        <div style={styles.pageContainer}>
            <div style={styles.profileContainer}>
                <h1 style={styles.headerTitle}>Perfil de Usuario</h1>

                {/* --- Sección de Información de la Cuenta --- */}
                <div style={styles.section}>
                    <h2 style={styles.sectionTitle}>Información de la Cuenta</h2>
                    {currentUser ? (
                        <div style={styles.infoGrid}>
                            <strong style={styles.infoLabel}>Usuario:</strong>
                            <span style={styles.infoValue}>{currentUser.username}</span>

                            <strong style={styles.infoLabel}>Rol:</strong>
                            <span style={styles.infoValue}>{currentUser.role}</span>
                        </div>
                    ) : (
                        <p>Cargando información del usuario...</p>
                    )}
                </div>

                <hr style={styles.separator} />

                {/* --- Sección para Cambiar Contraseña --- */}
                <div style={styles.section}>
                    <h2 style={styles.sectionTitle}>Cambiar Contraseña</h2>
                    <form onSubmit={handleSubmitPasswordChange}>
                        <div style={styles.formGroup}>
                            <label style={styles.label} htmlFor="new-password">Nueva Contraseña</label>
                            <input
                                id="new-password"
                                type="password"
                                placeholder="Mínimo 8 caracteres"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                required
                                style={styles.input}
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label} htmlFor="confirm-password">Confirmar Nueva Contraseña</label>
                            <input
                                id="confirm-password"
                                type="password"
                                placeholder="Repite la nueva contraseña"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                                style={styles.input}
                            />
                        </div>

                        {error && <p style={styles.errorMessage}>{error}</p>}
                        {success && <p style={styles.successMessage}>{success}</p>}

                        <button type="submit" style={loading ? {...styles.button, ...styles.buttonDisabled} : styles.button} disabled={loading}>
                            {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

const styles = {
    pageContainer: {
        padding: '20px',
    },
    profileContainer: {
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
        maxWidth: '800px',
        margin: '0 auto',
        padding: '30px 40px',
    },
    headerTitle: {
        textAlign: 'center',
        color: '#333',
        fontSize: '24px',
        fontWeight: '600',
        marginBottom: '30px',
        borderBottom: '1px solid #eee',
        paddingBottom: '20px',
    },
    section: {
        marginBottom: '30px',
    },
    sectionTitle: {
        fontSize: '18px',
        color: '#005646', // Verde oscuro
        borderBottom: '2px solid #005646',
        paddingBottom: '10px',
        marginBottom: '20px',
    },
    infoGrid: {
        display: 'grid',
        gridTemplateColumns: '100px 1fr', // Reducimos el ancho de la primera columna
        gap: '15px 20px',
        alignItems: 'center',
    },
    infoLabel: {
        fontWeight: 'bold',
        color: '#555',
        textAlign: 'right',
    },
    infoValue: {
        color: '#333',
        backgroundColor: '#f8f9fa',
        padding: '8px 12px',
        borderRadius: '4px',
        border: '1px solid #e9ecef',
    },
    separator: {
        border: 'none',
        borderTop: '1px solid #eee',
        margin: '40px 0',
    },
    formGroup: {
        marginBottom: '20px',
        maxWidth: '400px', // Limitamos el ancho del grupo de formulario
        marginRight: 'auto',
        marginLeft: 'auto',
    },
    label: {
        display: 'block',
        marginBottom: '8px',
        fontWeight: 'bold',
        color: '#555',
    },
    input: {
        width: '100%', // Ocupa el 100% del `formGroup` más angosto
        padding: '12px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '14px',
        boxSizing: 'border-box',
    },
    button: {
        width: '400px', // Ancho fijo para el botón para que coincida con los inputs
        maxWidth: '100%',
        padding: '12px',
        border: 'none',
        borderRadius: '4px',
        backgroundColor: '#A57F2C', // Dorado
        color: 'white',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
        marginLeft: 'auto',
        marginRight: 'auto',
        display: 'block',
    },
    buttonDisabled: {
        backgroundColor: '#ccc',
        cursor: 'not-allowed',
    },
    errorMessage: {
        color: '#dc3545',
        textAlign: 'center',
        marginBottom: '15px',
    },
    successMessage: {
        color: '#28a745',
        textAlign: 'center',
        marginBottom: '15px',
    },
};

export default ProfilePage;
