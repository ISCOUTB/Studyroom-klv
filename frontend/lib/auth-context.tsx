'import React, { createContext, useContext, useState, useEffect } from \'react\';';

export interface User {
  id: string;
  nombre: string;
  correo: string;
  rol: 'ESTUDIANTE' | 'TUTOR' | 'ADMINISTRADOR';
  token: string;
}

interface AuthContextType {
  user: User | null;
  login: (correo: string, pass: string) => Promise<boolean>;
  register: (nombre: string, correo: string, pass: string, carrera: string, semestre: number) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('utb_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('utb_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (correo: string, pass: string): Promise<boolean> => {
    if (!correo.endsWith('@utb.edu.co')) {
      throw new Error('Solo se permite el acceso con correo institucional @utb.edu.co');
    }
    // Simulación temporal demo para Sprint 0/1 (se conectará a API/Supabase)
    const mockUser: User = {
      id: 'usr-12345',
      nombre: correo.split('@')[0].replace('.', ' ').toUpperCase(),
      correo,
      rol: correo.includes('admin') ? 'ADMINISTRADOR' : correo.includes('tutor') ? 'TUTOR' : 'ESTUDIANTE',
      token: 'mock-jwt-token-utb-2026'
    };
    setUser(mockUser);
    localStorage.setItem('utb_user', JSON.stringify(mockUser));
    return true;
  };

  const register = async (nombre: string, correo: string, pass: string, carrera: string, semestre: number): Promise<boolean> => {
    if (!correo.endsWith('@utb.edu.co')) {
      throw new Error('El registro requiere un correo institucional @utb.edu.co');
    }
    const mockUser: User = {
      id: 'usr-' + Math.random().toString(36).substring(2, 9),
      nombre,
      correo,
      rol: 'ESTUDIANTE',
      token: 'mock-jwt-token-utb-2026'
    };
    setUser(mockUser);
    localStorage.setItem('utb_user', JSON.stringify(mockUser));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('utb_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
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
