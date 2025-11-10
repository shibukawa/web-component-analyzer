import { useState } from 'react';
import UserProfile from './UserProfile';
import TodoItem from './TodoItem';
import Counter from './Counter';
import SearchBox from './SearchBox';

/**
 * Demo component that uses all test components
 * This demonstrates how components with props and custom event handlers work together
 */
export default function Demo() {
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [counterValue, setCounterValue] = useState(0);
  const [todos, setTodos] = useState([
    { id: 1, title: 'Learn React', completed: false },
    { id: 2, title: 'Build DFD analyzer', completed: true },
    { id: 3, title: 'Test components', completed: false },
  ]);

  // UserProfile handlers
  const handleUserUpdate = (userId: string, email: string) => {
    console.log(`User ${userId} updated email to: ${email}`);
  };

  const handleUserDelete = (userId: string) => {
    console.log(`User ${userId} deleted`);
  };

  // TodoItem handlers
  const handleTodoToggle = (id: number) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const handleTodoEdit = (id: number, newTitle: string) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, title: newTitle } : todo
    ));
  };

  const handleTodoRemove = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  // Counter handlers
  const handleCounterChange = (value: number) => {
    setCounterValue(value);
    console.log('Counter changed to:', value);
  };

  const handleLimitReached = (limit: 'min' | 'max', value: number) => {
    console.log(`Counter ${limit} limit reached:`, value);
  };

  // SearchBox handlers
  const handleSearch = (query: string) => {
    console.log('Searching for:', query);
    // Simulate search results
    setSearchResults([
      `Result 1 for "${query}"`,
      `Result 2 for "${query}"`,
      `Result 3 for "${query}"`,
    ]);
  };

  const handleSearchClear = () => {
    console.log('Search cleared');
    setSearchResults([]);
  };

  return (
    <div className="demo">
      <h1>Component DFD Demo</h1>
      
      <section>
        <h2>User Profile</h2>
        <UserProfile
          userId="user-123"
          userName="John Doe"
          initialEmail="john@example.com"
          onUpdate={handleUserUpdate}
          onDelete={handleUserDelete}
        />
      </section>

      <section>
        <h2>Todo List</h2>
        {todos.map(todo => (
          <TodoItem
            key={todo.id}
            id={todo.id}
            title={todo.title}
            completed={todo.completed}
            onToggle={handleTodoToggle}
            onEdit={handleTodoEdit}
            onRemove={handleTodoRemove}
          />
        ))}
      </section>

      <section>
        <h2>Counter</h2>
        <Counter
          initialValue={0}
          step={5}
          min={-50}
          max={50}
          onChange={handleCounterChange}
          onLimitReached={handleLimitReached}
        />
        <p>Current value: {counterValue}</p>
      </section>

      <section>
        <h2>Search</h2>
        <SearchBox
          placeholder="Search components..."
          debounceMs={500}
          onSearch={handleSearch}
          onClear={handleSearchClear}
          onFocus={() => console.log('Search focused')}
          onBlur={() => console.log('Search blurred')}
        />
        {searchResults.length > 0 && (
          <ul>
            {searchResults.map((result, index) => (
              <li key={index}>{result}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
