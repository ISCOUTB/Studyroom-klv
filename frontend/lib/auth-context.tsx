'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest } from './api';

export interface User {
  id: string;
  nombre: string;
  correo: string;
  rol: 'ESTUDIANTE' | 'TUTOR' | 'ADMINISTRADOR';
  apellido?: string | null;
  ciudad?: string | null;
  pais?: string;
  zonaHoraria?: string;
  visibilidadCorreo?: 'CURSO' | 'OCULTO';
  fotoUrl?: string | null;
  emailVerificado?: boolean;
  creadoEn?: string;
  estudiante?: {
    carrera: string;
    semestre: number;
    fotoUrl: string | null;
  } | null;
  tutor?: {
    carrera: string;
    semestre: number;
    fotoUrl: string | null;
    biografia: string | null;
    modalidad: 'VIRTUAL' | 'PRESENCIAL';
    ubicacion: string | null;
    asignaturas: string[];
    aprobado: boolean;
  } | null;
}

interface RegisterData {
  nombre: string;
  correo: string;
  contrasena: string;
  carrera: string;
  semestre: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (correo: string, contrasena: string) => Promise<void>;
  register: (datos: RegisterData) => Promise<{ message: string }>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Al abrir la aplicación, si hay un token guardado, preguntamos al backend
  // quién es el usuario. Así la sesión sobrevive a una recarga de página.
  useEffect(() => {
    const storedToken = localStorage.getItem('utb_token');

    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    setToken(storedToken);

    const fetchMe = async () => {
      try {
        const data = await apiRequest('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });
        setUser(data.usuario);
      } catch {
        // Token vencido, inválido o backend apagado: se cierra la sesión local.
        localStorage.removeItem('utb_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMe();
  }, []);

  const login = async (correo: string, contrasena: string): Promise<void> => {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        correoUnico: correo.trim().toLowerCase(),
        contrasena,
      }),
    });

    localStorage.setItem('utb_token', data.token);
    setToken(data.token);
    setUser(data.usuario);
  };

  const register = async (datos: RegisterData): Promise<{ message: string }> => {
    if (!datos || typeof datos !== 'object') {
      throw new Error('Los datos del registro no son válidos.');
    }

    const data = await apiRequest('/api/auth/registro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nombre: String(datos.nombre ?? '').trim(),
        correoUnico: String(datos.correo ?? '').trim().toLowerCase(),
        contrasena: String(datos.contrasena ?? ''),
        carrera: String(datos.carrera ?? '').trim(),
        semestre: Number(datos.semestre),
      }),
    });

    // El registro NO inicia sesión: primero hay que verificar el correo.
    return { message: data.message };
  };

  const refreshUser = async (): Promise<void> => {
    const storedToken = token ?? localStorage.getItem('utb_token');
    if (!storedToken) return;

    const data = await apiRequest('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${storedToken}`,
      },
    });
    setUser(data.usuario);
  };

  const logout = () => {
    localStorage.removeItem('utb_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
