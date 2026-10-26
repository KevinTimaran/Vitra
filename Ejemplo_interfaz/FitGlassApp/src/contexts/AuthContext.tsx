import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuthToken, saveAuthToken, clearAuthStorage, getUserEmail, saveUserEmail } from '../services/auth/secureStorage';

interface AuthContextValue {
  userToken: string | null;
  userEmail: string | null;
  isLoadingToken: boolean;
  login: (token: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState<boolean>(true);

  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedToken = await getAuthToken();
        const storedEmail = await getUserEmail();
        if (storedToken) {
          setUserToken(storedToken);
          if (storedEmail) setUserEmail(storedEmail);
        }
      } catch (err) {
        console.warn('[AuthContext] Error cargando credenciales almacenadas:', err);
      } finally {
        setIsLoadingToken(false);
      }
    };

    loadStoredAuth();
  }, []);

  const login = async (token: string, email: string) => {
    setUserToken(token);
    setUserEmail(email);
    await saveAuthToken(token);
    await saveUserEmail(email);
  };

  const logout = async () => {
    setUserToken(null);
    setUserEmail(null);
    await clearAuthStorage();
  };

  return (
    <AuthContext.Provider
      value={{
        userToken,
        userEmail,
        isLoadingToken,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de un AuthProvider');
  }
  return context;
};
