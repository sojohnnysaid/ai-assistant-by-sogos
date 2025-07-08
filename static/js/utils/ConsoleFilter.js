/**
 * ConsoleFilter - Filters out unwanted console messages
 */
export class ConsoleFilter {
  constructor() {
    this.filters = [];
    this.originalMethods = {};
    this.isActive = false;
  }

  /**
   * Add a filter pattern
   * @param {string|RegExp} pattern - Pattern to filter
   * @param {string[]} methods - Console methods to filter (default: ['warn'])
   */
  addFilter(pattern, methods = ['warn']) {
    this.filters.push({
      pattern: pattern instanceof RegExp ? pattern : new RegExp(pattern),
      methods: new Set(methods)
    });
  }

  /**
   * Add common ONNX warning filters
   */
  addONNXFilters() {
    // Filter ONNX warnings
    this.addFilter(/onnx.*not supported/i, ['warn']);
    this.addFilter(/The requested module.*ort.*does not provide an export/i, ['warn']);
    this.addFilter(/CoreML.*not supported/i, ['warn']);
    this.addFilter(/Falling back to.*cpu/i, ['log', 'warn']);
    this.addFilter(/Removing initializer.*not used by any node/i, ['warn']);
    this.addFilter(/CleanUnusedInitializersAndNodeArgs/i, ['warn']);
    this.addFilter(/onnxruntime.*graph\.cc/i, ['warn']);
    
    // Filter Transformers.js warnings
    this.addFilter(/Using.*onnxruntime-web.*backend/i, ['log']);
    this.addFilter(/Model.*will be loaded from the Hugging Face Hub/i, ['log']);
  }

  /**
   * Add common development filters
   */
  addDevFilters() {
    // React/Vue dev warnings
    this.addFilter(/Download the React DevTools/i, ['log']);
    this.addFilter(/Download the Vue Devtools/i, ['log']);
    
    // Source map warnings
    this.addFilter(/DevTools failed to load source map/i, ['warn']);
    
    // Browser compatibility warnings
    this.addFilter(/Deprecation warning/i, ['warn']);
  }

  /**
   * Start filtering console output
   */
  start() {
    if (this.isActive) return;
    
    const methods = ['log', 'warn', 'error', 'info', 'debug'];
    
    methods.forEach(method => {
      this.originalMethods[method] = console[method];
      
      console[method] = (...args) => {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        
        const shouldFilter = this.filters.some(filter => {
          return filter.methods.has(method) && filter.pattern.test(message);
        });
        
        if (!shouldFilter) {
          this.originalMethods[method].apply(console, args);
        }
      };
    });
    
    this.isActive = true;
  }

  /**
   * Stop filtering console output
   */
  stop() {
    if (!this.isActive) return;
    
    Object.entries(this.originalMethods).forEach(([method, original]) => {
      console[method] = original;
    });
    
    this.originalMethods = {};
    this.isActive = false;
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    this.filters = [];
  }

  /**
   * Create and start a filter with common presets
   * @param {Object} options - Filter options
   * @returns {ConsoleFilter} Filter instance
   */
  static createWithPresets(options = {}) {
    const filter = new ConsoleFilter();
    
    if (options.onnx !== false) {
      filter.addONNXFilters();
    }
    
    if (options.dev) {
      filter.addDevFilters();
    }
    
    if (options.custom) {
      options.custom.forEach(({ pattern, methods }) => {
        filter.addFilter(pattern, methods);
      });
    }
    
    if (options.autoStart !== false) {
      filter.start();
    }
    
    return filter;
  }
}