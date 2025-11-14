import React, { useContext, createContext, useState } from 'react';

// Context definitions
interface ThemeContextType {
  theme: string;
}

interface AuthContextType {
  user: { name: string; id: string } | null;
  login: (username: string) => void;
  logout: () => void;
}

interface SettingsContextType {
  settings: {
    notifications: boolean;
    language: string;
  };
  updateSettings: (settings: any) => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'light' });
const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {}
});
const SettingsContext = createContext<SettingsContextType>({
  settings: { notifications: true, language: 'en' },
  updateSettings: () => {}
});

// Component with various useContext patterns
export default function WithContext() {
  // Read-only context (external-entity-input)
  const { theme } = useContext(ThemeContext);
  
  // Read-write context (data-store)
  const { settings, updateSettings } = useContext(SettingsContext);
  
  // Function-only context (external-entity-output)
  const { login, logout } = useContext(AuthContext);
  
  // Mixed context with data and functions
  const auth = useContext(AuthContext);
  
  const [localState, setLocalState] = useState('');

  const handleLogin = () => {
    login(localState);
  };

  const handleLogout = () => {
    logout();
  };

  const handleSettingsChange = () => {
    updateSettings({
      ...settings,
      notifications: !settings.notifications
    });
  };

  return (
    <div className={`theme-${theme}`}>
      <h1>Context Example</h1>
      
      {/* Read-only context usage */}
      <p>Current theme: {theme}</p>
      
      {/* Read-write context usage */}
      <div>
        <p>Notifications: {settings.notifications ? 'On' : 'Off'}</p>
        <p>Language: {settings.language}</p>
        <button onClick={handleSettingsChange}>Toggle Notifications</button>
      </div>
      
      {/* Function-only context usage */}
      <div>
        {auth.user ? (
          <div>
            <p>Welcome, {auth.user.name}</p>
            <button onClick={handleLogout}>Logout</button>
          </div>
        ) : (
          <div>
            <input
              type="text"
              value={localState}
              onChange={(e) => setLocalState(e.target.value)}
              placeholder="Username"
            />
            <button onClick={handleLogin}>Login</button>
          </div>
        )}
      </div>
    </div>
  );
}

// Export contexts for testing
export { ThemeContext, AuthContext, SettingsContext };
