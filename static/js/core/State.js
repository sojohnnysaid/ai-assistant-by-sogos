/**
 * State - Centralized state management with change notifications
 */
export class State {
  constructor(initialState = {}) {
    this.state = this.deepClone(initialState);
    this.listeners = new Map();
  }

  /**
   * Deep clone an object
   * @param {*} obj - Object to clone
   * @returns {*} Cloned object
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = this.deepClone(obj[key]);
      }
    }
    return clonedObj;
  }

  /**
   * Get state value by path
   * @param {string} path - Dot notation path (e.g., 'recording.isActive')
   * @returns {*} State value
   */
  get(path) {
    if (!path) return this.deepClone(this.state);
    
    const keys = path.split('.');
    let value = this.state;
    
    for (const key of keys) {
      if (value === null || value === undefined) return undefined;
      value = value[key];
    }
    
    return this.deepClone(value);
  }

  /**
   * Set state value by path
   * @param {string} path - Dot notation path
   * @param {*} value - New value
   */
  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    
    let target = this.state;
    for (const key of keys) {
      if (!(key in target) || typeof target[key] !== 'object') {
        target[key] = {};
      }
      target = target[key];
    }
    
    const oldValue = target[lastKey];
    target[lastKey] = this.deepClone(value);
    
    // Notify listeners
    this.notifyListeners(path, value, oldValue);
  }

  /**
   * Update multiple state values
   * @param {Object} updates - Object with paths as keys and new values
   */
  update(updates) {
    Object.entries(updates).forEach(([path, value]) => {
      this.set(path, value);
    });
  }

  /**
   * Subscribe to state changes
   * @param {string} path - Path to watch (use '*' for all changes)
   * @param {Function} callback - Called when state changes
   * @returns {Function} Unsubscribe function
   */
  subscribe(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    
    this.listeners.get(path).add(callback);
    
    return () => {
      const callbacks = this.listeners.get(path);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(path);
        }
      }
    };
  }

  /**
   * Notify listeners of state change
   * @param {string} path - Changed path
   * @param {*} newValue - New value
   * @param {*} oldValue - Previous value
   */
  notifyListeners(path, newValue, oldValue) {
    // Notify specific path listeners
    const pathListeners = this.listeners.get(path);
    if (pathListeners) {
      pathListeners.forEach(callback => {
        try {
          callback(newValue, oldValue, path);
        } catch (error) {
          console.error(`Error in state listener for ${path}:`, error);
        }
      });
    }
    
    // Notify wildcard listeners
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach(callback => {
        try {
          callback({ path, newValue, oldValue });
        } catch (error) {
          console.error('Error in wildcard state listener:', error);
        }
      });
    }
  }

  /**
   * Reset state to initial values
   * @param {Object} initialState - New initial state
   */
  reset(initialState = {}) {
    this.state = this.deepClone(initialState);
    this.notifyListeners('*', this.state, null);
  }
}