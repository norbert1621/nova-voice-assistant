type Listener<T = void> = (data: T) => void;

class EventBus {
  private listeners: Map<string, Set<Listener<any>>> = new Map();

  on<T = void>(event: string, listener: Listener<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    // Return unsubscribe function
    return () => this.off(event, listener);
  }

  off<T = void>(event: string, listener: Listener<T>): void {
    this.listeners.get(event)?.delete(listener);
  }

  emit<T = void>(event: string, data?: T): void {
    this.listeners.get(event)?.forEach((listener) => listener(data));
  }
}

export const eventBus = new EventBus();

// Typed event names
export const Events = {
  WAKE_WORD: 'wakeword',
  ERROR: 'error',
} as const;
