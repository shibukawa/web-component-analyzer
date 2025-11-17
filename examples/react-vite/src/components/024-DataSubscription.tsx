import { useState, useEffect } from 'react';

/**
 * DataSubscription component with cleanup function
 * Demonstrates useEffect with cleanup for API subscription management
 */

// Mock API for demonstration
const api = {
  subscribe: (userId: string, callback: (data: any) => void) => {
    console.log(`Subscribing to user ${userId}`);
    const intervalId = setInterval(() => {
      callback({ timestamp: Date.now(), message: 'New data' });
    }, 2000);
    return intervalId;
  },
  unsubscribe: (subscriptionId: number) => {
    console.log(`Unsubscribing: ${subscriptionId}`);
    clearInterval(subscriptionId);
  }
};

const logger = {
  log: (message: string) => {
    console.log(`[Logger] ${message}`);
  }
};

interface Props {
  userId: string;
}

export default function DataSubscription({ userId }: Props) {
  const [data, setData] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setIsConnected(true);
    
    const subscriptionId = api.subscribe(userId, (newData) => {
      setData(newData);
    });

    // Cleanup function with multiple external calls
    return () => {
      api.unsubscribe(subscriptionId);
      logger.log(`Cleanup: unsubscribed from user ${userId}`);
      setIsConnected(false);
    };
  }, [userId]);

  return (
    <div>
      <h2>Data Subscription</h2>
      <p>User ID: {userId}</p>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      {data && (
        <div>
          <p>Last Update: {new Date(data.timestamp).toLocaleTimeString()}</p>
          <p>Message: {data.message}</p>
        </div>
      )}
    </div>
  );
}
