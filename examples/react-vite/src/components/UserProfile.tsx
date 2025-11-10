import { useState } from 'react';

interface UserProfileProps {
  userId: string;
  userName: string;
  initialEmail?: string;
  onUpdate?: (userId: string, email: string) => void;
  onDelete?: (userId: string) => void;
}

/**
 * UserProfile component with props and custom event handlers
 * This component demonstrates:
 * - Props (userId, userName, initialEmail)
 * - Custom event handlers (onUpdate, onDelete)
 * - Internal state management
 * - Inline callbacks
 */
export default function UserProfile({ 
  userId, 
  userName, 
  initialEmail = '', 
  onUpdate,
  onDelete 
}: UserProfileProps) {
  const [email, setEmail] = useState(initialEmail);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(userId, email);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEmail(initialEmail);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(userId);
    }
  };

  return (
    <div className="user-profile">
      <h2>{userName}</h2>
      <p>User ID: {userId}</p>
      
      {isEditing ? (
        <div>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
          />
          <button onClick={handleSave}>Save</button>
          <button onClick={handleCancel}>Cancel</button>
        </div>
      ) : (
        <div>
          <p>Email: {email || 'Not set'}</p>
          <button onClick={() => setIsEditing(true)}>Edit</button>
          <button onClick={handleDelete}>Delete</button>
        </div>
      )}
    </div>
  );
}
