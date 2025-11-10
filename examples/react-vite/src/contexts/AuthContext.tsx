import { createContext, useState, type ReactNode } from 'react';

/**
 * Authentication context with both data and function values
 * This demonstrates type-based classification for useContext
 */

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  // Data values
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Function values
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
}

// Default context value to ensure all properties are always available
const defaultAuthContext: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: async () => {
    console.warn('AuthContext not initialized');
  },
  logout: () => {
    console.warn('AuthContext not initialized');
  },
  updateProfile: () => {
    console.warn('AuthContext not initialized');
  }
};

export const AuthContext = createContext<AuthContextType>(defaultAuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Simulate API call (password would be used in real implementation)
      console.log('Logging in with:', email, password);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setUser({
        id: '1',
        name: 'John Doe',
        email
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
  };

  const updateProfile = (data: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...data });
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
