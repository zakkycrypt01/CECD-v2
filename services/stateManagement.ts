/**
 * State Management Helper - Simplified state management utilities
 */

import { loggerService } from './loggerService';

export type StateListener<T> = (state: T) => void;
export type StateReducer<T, A> = (state: T, action: A) => T;

/**
 * Simple observable state store
 */
export class StateStore<T> {
  private state: T;
  private listeners: Set<StateListener<T>> = new Set();

  constructor(initialState: T) {
    this.state = initialState;
  }

  /**
   * Get current state
   */
  getState(): T {
    return this.state;
  }

  /**
   * Update state
   */
  setState(updater: T | ((current: T) => T)): void {
    const newState = typeof updater === 'function' ? updater(this.state) : updater;

    if (newState !== this.state) {
      this.state = newState;
      this.notifyListeners();
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: StateListener<T>): () => void {
    this.listeners.add(listener);

    // Call listener with current state immediately
    listener(this.state);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (error) {
        loggerService.error('StateStore', 'Listener error', error as Error);
      }
    }
  }

  /**
   * Get number of active listeners
   */
  getListenerCount(): number {
    return this.listeners.size;
  }
}

/**
 * Reducer-based state store
 */
export class ReducerStore<T, A> {
  private state: T;
  private listeners: Set<StateListener<T>> = new Set();
  private reducer: StateReducer<T, A>;
  private actionHistory: A[] = [];
  private maxHistory = 100;

  constructor(initialState: T, reducer: StateReducer<T, A>) {
    this.state = initialState;
    this.reducer = reducer;
  }

  /**
   * Get current state
   */
  getState(): T {
    return this.state;
  }

  /**
   * Dispatch an action
   */
  dispatch(action: A): void {
    const oldState = this.state;
    this.state = this.reducer(this.state, action);

    // Track action history
    this.actionHistory.push(action);
    if (this.actionHistory.length > this.maxHistory) {
      this.actionHistory = this.actionHistory.slice(-this.maxHistory);
    }

    if (oldState !== this.state) {
      this.notifyListeners();
      loggerService.debug('ReducerStore', 'State updated', {
        action: JSON.stringify(action).slice(0, 100)
      });
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: StateListener<T>): () => void {
    this.listeners.add(listener);

    // Call listener with current state immediately
    listener(this.state);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (error) {
        loggerService.error('ReducerStore', 'Listener error', error as Error);
      }
    }
  }

  /**
   * Get action history
   */
  getActionHistory(): A[] {
    return this.actionHistory.slice();
  }

  /**
   * Clear action history
   */
  clearActionHistory(): void {
    this.actionHistory = [];
  }

  /**
   * Get listener count
   */
  getListenerCount(): number {
    return this.listeners.size;
  }
}

/**
 * Create a simple state hook-like interface
 */
export function createState<T>(initialState: T) {
  const store = new StateStore(initialState);

  return {
    useState: () => {
      return [store.getState, (updater: T | ((current: T) => T)) => store.setState(updater)];
    },
    getState: () => store.getState(),
    setState: (updater: T | ((current: T) => T)) => store.setState(updater),
    subscribe: (listener: StateListener<T>) => store.subscribe(listener),
    getListenerCount: () => store.getListenerCount()
  };
}

/**
 * Create a reducer-based state
 */
export function createReducerState<T, A>(initialState: T, reducer: StateReducer<T, A>) {
  const store = new ReducerStore(initialState, reducer);

  return {
    getState: () => store.getState(),
    dispatch: (action: A) => store.dispatch(action),
    subscribe: (listener: StateListener<T>) => store.subscribe(listener),
    getActionHistory: () => store.getActionHistory(),
    clearActionHistory: () => store.clearActionHistory(),
    getListenerCount: () => store.getListenerCount()
  };
}

/**
 * Create a computed state (derived state)
 */
export function createComputedState<T, U>(
  source: StateStore<T>,
  selector: (state: T) => U,
  initialValue: U
): StateStore<U> {
  const computed = new StateStore(initialValue);

  source.subscribe((state) => {
    const value = selector(state);
    computed.setState(value);
  });

  return computed;
}

export default {
  StateStore,
  ReducerStore,
  createState,
  createReducerState,
  createComputedState
};
