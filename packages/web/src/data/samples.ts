/**
 * Sample component data for the web application
 * These samples demonstrate various component patterns across React, Vue, and Svelte
 */

export interface SampleComponent {
  id: string;
  name: string;
  framework: 'react' | 'vue' | 'svelte';
  code: string;
  description: string;
}

export const REACT_SAMPLES: SampleComponent[] = [
  {
    id: 'react-simple-greeting',
    name: 'Simple Greeting',
    framework: 'react',
    description: 'Simple component with props, state, and basic event handler',
    code: `import { useState } from 'react';

interface SimpleGreetingProps {
  name: string;
  greeting?: string;
}

/**
 * Simple component for testing basic DFD visualization
 * Expected nodes: 5-10
 * - 2 input props (name, greeting)
 * - 1 state (count)
 * - 1 process (handleClick)
 * - 3 outputs (greeting display, count display, button)
 */
export default function SimpleGreeting({ name, greeting = 'Hello' }: SimpleGreetingProps) {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(count + 1);
  };

  return (
    <div>
      <h1>{greeting}, {name}!</h1>
      <p>You clicked {count} times</p>
      <button onClick={handleClick}>Click me</button>
    </div>
  );
}`
  },
  {
    id: 'react-counter',
    name: 'Counter',
    framework: 'react',
    description: 'Counter component with props and custom event handlers',
    code: `import { useState } from 'react';

interface CounterProps {
  initialValue?: number;
  step?: number;
  min?: number;
  max?: number;
  onChange?: (value: number) => void;
  onLimitReached?: (limit: 'min' | 'max', value: number) => void;
}

/**
 * Counter component with props and custom event handlers
 * This component demonstrates:
 * - Optional props with default values
 * - Custom event handlers with different signatures
 * - Conditional logic in event handlers
 * - Mix of inline callbacks and named handlers
 */
export default function Counter({ 
  initialValue = 0, 
  step = 1, 
  min = -Infinity, 
  max = Infinity,
  onChange,
  onLimitReached
}: CounterProps) {
  const [count, setCount] = useState(initialValue);

  const handleIncrement = () => {
    const newValue = count + step;
    if (newValue <= max) {
      setCount(newValue);
      if (onChange) {
        onChange(newValue);
      }
    } else {
      if (onLimitReached) {
        onLimitReached('max', max);
      }
    }
  };

  const handleDecrement = () => {
    const newValue = count - step;
    if (newValue >= min) {
      setCount(newValue);
      if (onChange) {
        onChange(newValue);
      }
    } else {
      if (onLimitReached) {
        onLimitReached('min', min);
      }
    }
  };

  const handleReset = () => {
    setCount(initialValue);
    if (onChange) {
      onChange(initialValue);
    }
  };

  return (
    <div className="counter">
      <h3>Counter</h3>
      <div className="counter-display">
        <button onClick={handleDecrement} disabled={count <= min}>
          -
        </button>
        <span className="count-value">{count}</span>
        <button onClick={handleIncrement} disabled={count >= max}>
          +
        </button>
      </div>
      <div className="counter-controls">
        <button onClick={handleReset}>Reset</button>
        <button onClick={() => setCount(count * 2)}>Double</button>
        <button onClick={() => setCount(Math.floor(count / 2))}>Half</button>
      </div>
      <div className="counter-info">
        <small>Step: {step} | Min: {min} | Max: {max}</small>
      </div>
    </div>
  );
}`
  },
  {
    id: 'react-timer',
    name: 'Timer',
    framework: 'react',
    description: 'Timer component with cleanup function demonstrating useEffect',
    code: `import { useState, useEffect } from 'react';

/**
 * Timer component with cleanup function
 * Demonstrates useEffect with cleanup for timer management
 */
export default function Timer() {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const intervalId = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);

    // Cleanup function
    return () => {
      clearInterval(intervalId);
      console.log('Timer cleanup: interval cleared');
    };
  }, [isRunning]);

  const handleStart = () => {
    setIsRunning(true);
  };

  const handleStop = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setSeconds(0);
    setIsRunning(false);
  };

  return (
    <div>
      <h2>Timer</h2>
      <p>Seconds: {seconds}</p>
      <button onClick={handleStart} disabled={isRunning}>
        Start
      </button>
      <button onClick={handleStop} disabled={!isRunning}>
        Stop
      </button>
      <button onClick={handleReset}>
        Reset
      </button>
    </div>
  );
}`
  },
  {
    id: 'react-auth-consumer',
    name: 'Auth Consumer',
    framework: 'react',
    description: 'Component demonstrating useContext with type-based classification',
    code: `import { useContext, useState, useEffect } from 'react';
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
}`
  },
  {
    id: 'react-user-profile',
    name: 'User Profile',
    framework: 'react',
    description: 'UserProfile component with props and custom event handlers',
    code: `import { useState } from 'react';

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
}`
  },
  {
    id: 'react-reducer-counter',
    name: 'Reducer Counter',
    framework: 'react',
    description: 'Component demonstrating useReducer with multiple state properties',
    code: `import { useReducer, useEffect } from 'react';

/**
 * Reducer state interface with multiple properties
 */
interface CounterState {
  count: number;
  step: number;
  history: number[];
}

/**
 * Reducer action types
 */
type CounterAction =
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'SET_STEP'; payload: number }
  | { type: 'RESET' };

/**
 * Reducer function
 */
function counterReducer(state: CounterState, action: CounterAction): CounterState {
  switch (action.type) {
    case 'INCREMENT':
      return {
        ...state,
        count: state.count + state.step,
        history: [...state.history, state.count + state.step]
      };
    case 'DECREMENT':
      return {
        ...state,
        count: state.count - state.step,
        history: [...state.history, state.count - state.step]
      };
    case 'SET_STEP':
      return {
        ...state,
        step: action.payload
      };
    case 'RESET':
      return {
        count: 0,
        step: 1,
        history: [0]
      };
    default:
      return state;
  }
}

/**
 * Component demonstrating useReducer with multiple state properties
 * 
 * This component showcases:
 * - useReducer with complex state object (count, step, history)
 * - Dispatch calls in event handlers
 * - Dispatch calls in useEffect
 * - State properties displayed in JSX
 */
export default function ReducerCounter() {
  const [{ count, step, history }, dispatch] = useReducer(counterReducer, {
    count: 0,
    step: 1,
    history: [0]
  });

  // Effect that logs history changes
  useEffect(() => {
    console.log('History updated:', history);
    
    // Dispatch action when history gets too long
    if (history.length > 10) {
      dispatch({ type: 'RESET' });
    }
  }, [history]);

  // Event handlers that dispatch actions
  const handleIncrement = () => {
    dispatch({ type: 'INCREMENT' });
  };

  const handleDecrement = () => {
    dispatch({ type: 'DECREMENT' });
  };

  const handleStepChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newStep = parseInt(event.target.value, 10);
    if (!isNaN(newStep)) {
      dispatch({ type: 'SET_STEP', payload: newStep });
    }
  };

  const handleReset = () => {
    dispatch({ type: 'RESET' });
  };

  return (
    <div className="reducer-counter">
      <h2>Reducer Counter</h2>
      
      <div className="counter-display">
        <p>Current Count: {count}</p>
        <p>Step Size: {step}</p>
        <p>History Length: {history.length}</p>
      </div>

      <div className="controls">
        <button onClick={handleIncrement}>Increment</button>
        <button onClick={handleDecrement}>Decrement</button>
        <button onClick={handleReset}>Reset</button>
      </div>

      <div className="step-control">
        <label>
          Step Size:
          <input
            type="number"
            value={step}
            onChange={handleStepChange}
            min="1"
          />
        </label>
      </div>

      <div className="history">
        <h3>History</h3>
        <ul>
          {history.map((value, index) => (
            <li key={index}>{value}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}`
  },
  {
    id: 'react-task-manager',
    name: 'Task Manager',
    framework: 'react',
    description: 'Medium complexity component with multiple states, effects, and handlers',
    code: `import { useState, useMemo, useEffect } from 'react';

interface Task {
  id: number;
  text: string;
  completed: boolean;
}

interface TaskManagerProps {
  initialTasks?: Task[];
  onTaskComplete?: (taskId: number) => void;
}

type FilterType = 'all' | 'active' | 'completed';

/**
 * Medium complexity component for testing DFD visualization
 * Expected nodes: 20-30
 * - 2 input props
 * - 5 states (tasks, inputValue, filter, filteredTasks, stats)
 * - 8 processes (5 handlers, 2 computations, 1 effect)
 * - 6 outputs
 */
export default function TaskManager({ 
  initialTasks = [], 
  onTaskComplete 
}: TaskManagerProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [inputValue, setInputValue] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleAddTask = () => {
    if (inputValue.trim()) {
      const newTask: Task = {
        id: Date.now(),
        text: inputValue,
        completed: false
      };
      setTasks([...tasks, newTask]);
      setInputValue('');
    }
  };

  const handleToggleTask = (id: number) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const handleDeleteTask = (id: number) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
  };

  // Computed: Filter tasks based on active filter
  const filteredTasks = useMemo(() => {
    switch (filter) {
      case 'active':
        return tasks.filter(task => !task.completed);
      case 'completed':
        return tasks.filter(task => task.completed);
      default:
        return tasks;
    }
  }, [tasks, filter]);

  // Computed: Calculate statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const active = total - completed;
    return { total, completed, active };
  }, [tasks]);

  // Effect: Notify parent when task is completed
  useEffect(() => {
    const lastCompletedTask = tasks
      .filter(t => t.completed)
      .sort((a, b) => b.id - a.id)[0];
    
    if (lastCompletedTask && onTaskComplete) {
      onTaskComplete(lastCompletedTask.id);
    }
  }, [tasks, onTaskComplete]);

  return (
    <div className="task-manager">
      <h2>Task Manager</h2>
      
      <div className="input-section">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Enter a task..."
          onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
        />
        <button onClick={handleAddTask}>Add Task</button>
      </div>

      <div className="filter-section">
        <button 
          onClick={() => handleFilterChange('all')}
          className={filter === 'all' ? 'active' : ''}
        >
          All ({stats.total})
        </button>
        <button 
          onClick={() => handleFilterChange('active')}
          className={filter === 'active' ? 'active' : ''}
        >
          Active ({stats.active})
        </button>
        <button 
          onClick={() => handleFilterChange('completed')}
          className={filter === 'completed' ? 'active' : ''}
        >
          Completed ({stats.completed})
        </button>
      </div>

      <ul className="task-list">
        {filteredTasks.map(task => (
          <li key={task.id} className={task.completed ? 'completed' : ''}>
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => handleToggleTask(task.id)}
            />
            <span>{task.text}</span>
            <button onClick={() => handleDeleteTask(task.id)}>Delete</button>
          </li>
        ))}
      </ul>

      <div className="stats">
        <p>Total: {stats.total} | Active: {stats.active} | Completed: {stats.completed}</p>
      </div>
    </div>
  );
}`
  },
  {
    id: 'react-search-box',
    name: 'Search Box',
    framework: 'react',
    description: 'SearchBox component with props and custom event handlers',
    code: `import { useState, useEffect } from 'react';

interface SearchBoxProps {
  placeholder?: string;
  debounceMs?: number;
  onSearch: (query: string) => void;
  onClear?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * SearchBox component with props and custom event handlers
 * This component demonstrates:
 * - Props with function types
 * - useEffect hook for debouncing
 * - Multiple event handlers (onSearch, onClear, onFocus, onBlur)
 * - Inline callbacks for DOM events
 * - State management with derived values
 */
export default function SearchBox({ 
  placeholder = 'Search...', 
  debounceMs = 300,
  onSearch,
  onClear,
  onFocus,
  onBlur
}: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        onSearch(query);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs, onSearch]);

  const handleClear = () => {
    setQuery('');
    if (onClear) {
      onClear();
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (onFocus) {
      onFocus();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (onBlur) {
      onBlur();
    }
  };

  return (
    <div className={\`search-box \${isFocused ? 'focused' : ''}\`}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="search-input"
      />
      {query && (
        <button 
          onClick={handleClear}
          className="clear-button"
          aria-label="Clear search"
        >
          ×
        </button>
      )}
      <div className="search-info">
        {query && <small>Searching for: {query}</small>}
      </div>
    </div>
  );
}`
  }
];

// Vue samples
export const VUE_SAMPLES: SampleComponent[] = [
  {
    id: 'vue-emits',
    name: 'Emits Example',
    framework: 'vue',
    description: 'Vue component demonstrating defineEmits with event handlers',
    code: `<template>
  <div class="emits-component">
    <h2>Emits Example</h2>
    <input 
      :value="inputValue" 
      @input="handleInput"
      placeholder="Type something..."
    />
    <button @click="handleSubmit">Submit</button>
    <button @click="handleCancel">Cancel</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// Define emits
const emit = defineEmits<{
  update: [value: string];
  submit: [data: { text: string; timestamp: number }];
  cancel: [];
}>();

// State
const inputValue = ref('');

// Event handlers
function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  inputValue.value = target.value;
  emit('update', target.value);
}

function handleSubmit() {
  const data = {
    text: inputValue.value,
    timestamp: Date.now()
  };
  emit('submit', data);
  inputValue.value = '';
}

function handleCancel() {
  inputValue.value = '';
  emit('cancel');
}
</script>`
  },
  {
    id: 'vue-template-bindings',
    name: 'Template Bindings',
    framework: 'vue',
    description: 'Vue component demonstrating various template directives and bindings',
    code: `<template>
  <div class="template-bindings">
    <h2>Template Bindings Example</h2>
    
    <!-- Mustache binding -->
    <p>Message: {{ message }}</p>
    
    <!-- v-bind / : directive -->
    <input :value="inputValue" :placeholder="placeholderText" />
    <div :class="dynamicClass" :style="dynamicStyle">Styled Content</div>
    
    <!-- v-on / @ directive -->
    <button @click="handleClick">Click Me</button>
    <input @input="handleInput" @focus="handleFocus" />
    
    <!-- v-model directive -->
    <input v-model="modelValue" placeholder="Two-way binding" />
    <textarea v-model="textareaValue"></textarea>
    
    <!-- v-if / v-show directives -->
    <p v-if="showContent">Conditional Content</p>
    <p v-show="isVisible">Visible Content</p>
    
    <!-- v-for directive -->
    <ul>
      <li v-for="item in items" :key="item.id">{{ item.name }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// State
const message = ref('Hello Vue!');
const inputValue = ref('');
const placeholderText = ref('Enter text...');
const modelValue = ref('');
const textareaValue = ref('');
const showContent = ref(true);
const isVisible = ref(true);
const items = ref([
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' },
  { id: 3, name: 'Item 3' }
]);

// Computed
const dynamicClass = computed(() => showContent.value ? 'active' : 'inactive');
const dynamicStyle = computed(() => ({
  color: isVisible.value ? 'blue' : 'gray'
}));

// Event handlers
function handleClick() {
  showContent.value = !showContent.value;
}

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  inputValue.value = target.value;
}

function handleFocus() {
  console.log('Input focused');
}
</script>`
  },
  {
    id: 'vue-pinia',
    name: 'Pinia Store',
    framework: 'vue',
    description: 'Vue component demonstrating Pinia state management',
    code: `<template>
  <div class="pinia-component">
    <h2>Pinia Store Example</h2>
    <p>Count: {{ count }}</p>
    <p>Double Count: {{ doubleCount }}</p>
    <p>User Name: {{ userName }}</p>
    <button @click="increment">Increment</button>
    <button @click="decrement">Decrement</button>
    <button @click="reset">Reset</button>
    <button @click="updateUser">Update User</button>
  </div>
</template>

<script setup lang="ts">
import { useCounterStore } from '../stores/counter';
import { useUserStore } from '../stores/user';
import { storeToRefs } from 'pinia';

// Access stores
const counterStore = useCounterStore();
const userStore = useUserStore();

// Convert state to refs
const { count, doubleCount } = storeToRefs(counterStore);
const { userName } = storeToRefs(userStore);

// Call store actions
function increment() {
  counterStore.increment();
}

function decrement() {
  counterStore.decrement();
}

function reset() {
  counterStore.reset();
}

function updateUser() {
  userStore.updateName('John Doe');
}
</script>`
  },
  {
    id: 'vue-simple-counter',
    name: 'Simple Counter',
    framework: 'vue',
    description: 'Simple Vue counter with ref state and event handlers',
    code: `<template>
  <div class="counter">
    <h2>Simple Counter</h2>
    <p>Count: {{ count }}</p>
    <button @click="increment">Increment</button>
    <button @click="decrement">Decrement</button>
    <button @click="reset">Reset</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const count = ref(0);

function increment() {
  count.value++;
}

function decrement() {
  count.value--;
}

function reset() {
  count.value = 0;
}
</script>`
  },
  {
    id: 'vue-props-example',
    name: 'Props Example',
    framework: 'vue',
    description: 'Vue component demonstrating defineProps with TypeScript',
    code: `<template>
  <div class="props-example">
    <h2>{{ title }}</h2>
    <p>{{ message }}</p>
    <p>Count: {{ count }}</p>
    <button @click="handleClick">Click Me</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// Define props
const props = defineProps<{
  title: string;
  message: string;
  initialCount?: number;
}>();

// State
const count = ref(props.initialCount || 0);

// Event handler
function handleClick() {
  count.value++;
}
</script>`
  }
];;

// Svelte samples will be added when svelte-vite example project is created
export const SVELTE_SAMPLES: SampleComponent[] = [];

export const ALL_SAMPLES: SampleComponent[] = [
  ...REACT_SAMPLES,
  ...VUE_SAMPLES,
  ...SVELTE_SAMPLES
];
