import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';

/**
 * Component demonstrating useContext with type-based classification
 * 
 * Expected DFD structure:
 * - Data-store node: "user, isAuthenticated, isLoading" (data values only)
 * - Write methods stored: ["login", "logout", "updateProfile"] (for edge inference)
 * - Edges: handleLogin → context data-store (via login function)
 * - Edges: handleLogout → context data-store (via logout function)
 * - Edges: handleUpdateProfile → context data-store (via updateProfile function)
 * - Edges: context data-store → JSX (displaying user, isAuthenticated, isLoading)
 */
export default function AuthConsumer() {
  // Destructure context values - TypeResolver should classify these
  const { user, isAuthenticated, isLoading, login, logout, updateProfile } = useContext(AuthContext);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    console.log('Auth state changed:', { user, isAuthenticated, isLoading });
  }, [user, isAuthenticated, isLoading]);

  const handleLogin = async () => {
    await login(email, password);
  };

  const handleLogout = () => {
    logout();
  };

  const handleUpdateProfile = () => {
    updateProfile({ name: 'Jane Doe' });
  };

  return (
    <div>
      <h2>Authentication Demo</h2>
      
      {isLoading && <p>Loading...</p>}
      
      {!isAuthenticated ? (
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          <button onClick={handleLogin}>Login</button>
        </div>
      ) : (
        <div>
          <p>Welcome, {user?.name}!</p>
          <p>Email: {user?.email}</p>
          <button onClick={handleUpdateProfile}>Update Profile</button>
          <button onClick={handleLogout}>Logout</button>
        </div>
      )}
    </div>
  );
}
