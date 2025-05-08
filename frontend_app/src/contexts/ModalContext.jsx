// src/contexts/ModalContext.jsx
import React, { createContext, useState, useContext, useCallback } from 'react';

const ModalContext = createContext(null);

export const ModalProvider = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null); // Guarda datos del doctor a editar, o null si es nuevo

  // Función para abrir el modal
  // Recibe datos del doctor si es para editar, o null/undefined si es para agregar
  const openModal = useCallback((doctorData = null) => {
    setEditingDoctor(doctorData);
    setIsModalOpen(true);
  }, []);

  // Función para cerrar el modal
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingDoctor(null); // Limpia los datos al cerrar
  }, []);

  const value = {
    isModalOpen,
    editingDoctor,
    openModal,
    closeModal,
  };

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
};

// Hook personalizado para usar el contexto fácilmente
export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
