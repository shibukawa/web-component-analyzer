/*
ACCEPTANCE_TEST:
  description: "Medium complexity component with multiple states, effects, and handlers (20-30 nodes)"
  
  external_entities_input:
    - name: "initialTasks"
      type: "prop"
      dataType: "array"
    - name: "onTaskComplete"
      type: "prop"
      dataType: "function"
  
  processes:
    - name: "handleAddTask"
      description: "Adds a new task to the list"
      type: "event_handler"
    - name: "handleToggleTask"
      description: "Toggles task completion status"
      type: "event_handler"
    - name: "handleDeleteTask"
      description: "Removes a task from the list"
      type: "event_handler"
    - name: "handleFilterChange"
      description: "Changes the active filter"
      type: "event_handler"
    - name: "handleInputChange"
      description: "Updates input field value"
      type: "event_handler"
    - name: "filterTasks"
      description: "Filters tasks based on active filter"
      type: "computation"
    - name: "calculateStats"
      description: "Calculates task statistics"
      type: "computation"
    - name: "notifyCompletion"
      description: "Notifies parent when task is completed"
      type: "effect"
  
  data_stores:
    - name: "tasks"
      type: "state"
      dataType: "array"
    - name: "inputValue"
      type: "state"
      dataType: "string"
    - name: "filter"
      type: "state"
      dataType: "string"
    - name: "filteredTasks"
      type: "computed"
      dataType: "array"
    - name: "stats"
      type: "computed"
      dataType: "object"
  
  external_entities_output:
    - name: "input_field"
      type: "template"
      target: "input"
    - name: "add_button"
      type: "template"
      target: "button"
    - name: "filter_buttons"
      type: "template"
      target: "button"
    - name: "task_list"
      type: "template"
      target: "ul"
    - name: "stats_display"
      type: "template"
      target: "div"
    - name: "onTaskComplete_call"
      type: "function_call"
      target: "onTaskComplete"
*/

import { useState, useMemo, useEffect } from 'react';

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
}
