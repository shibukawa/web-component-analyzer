import { useState } from 'react';

interface TodoItemProps {
  id: number;
  title: string;
  completed: boolean;
  onToggle: (id: number) => void;
  onEdit: (id: number, newTitle: string) => void;
  onRemove: (id: number) => void;
}

/**
 * TodoItem component with props and multiple custom event handlers
 * This component demonstrates:
 * - Multiple props including primitive types and booleans
 * - Multiple custom event handlers (onToggle, onEdit, onRemove)
 * - Conditional rendering based on state
 * - Named event handlers and inline callbacks
 */
export default function TodoItem({ 
  id, 
  title, 
  completed, 
  onToggle, 
  onEdit, 
  onRemove 
}: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(title);

  const handleSaveEdit = () => {
    if (editText.trim()) {
      onEdit(id, editText);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditText(title);
    setIsEditing(false);
  };

  return (
    <div className={`todo-item ${completed ? 'completed' : ''}`}>
      {isEditing ? (
        <div className="edit-mode">
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSaveEdit();
              }
            }}
          />
          <button onClick={handleSaveEdit}>Save</button>
          <button onClick={handleCancelEdit}>Cancel</button>
        </div>
      ) : (
        <div className="view-mode">
          <input
            type="checkbox"
            checked={completed}
            onChange={() => onToggle(id)}
          />
          <span 
            onDoubleClick={() => setIsEditing(true)}
            style={{ textDecoration: completed ? 'line-through' : 'none' }}
          >
            {title}
          </span>
          <button onClick={() => setIsEditing(true)}>Edit</button>
          <button onClick={() => onRemove(id)}>Remove</button>
        </div>
      )}
    </div>
  );
}
