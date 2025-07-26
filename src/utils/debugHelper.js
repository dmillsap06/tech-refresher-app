/**
 * Debug helper utility for tracing application flow and errors
 */

// Enable or disable verbose debug logging globally
const DEBUG_ENABLED = true;

// Log levels
const LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

/**
 * Log a debug message with optional data
 * @param {string} source - Source of the log (component/function name)
 * @param {string} message - Log message
 * @param {any} data - Optional data to include in the log
 */
export const debug = (source, message, data = undefined) => {
  if (!DEBUG_ENABLED) return;
  
  console.log(`[${source}] ${message}`, data !== undefined ? data : '');
};

/**
 * Log an informational message
 * @param {string} source - Source of the log
 * @param {string} message - Log message
 * @param {any} data - Optional data
 */
export const info = (source, message, data = undefined) => {
  console.info(`[${source}] ${message}`, data !== undefined ? data : '');
};

/**
 * Log a warning message
 * @param {string} source - Source of the log
 * @param {string} message - Warning message
 * @param {any} data - Optional data
 */
export const warn = (source, message, data = undefined) => {
  console.warn(`[${source}] ${message}`, data !== undefined ? data : '');
};

/**
 * Log an error message and optionally send to error logging service
 * @param {string} source - Source of the error
 * @param {Error|string} error - The error object or message
 * @param {Object} context - Additional context information
 * @param {boolean} sendToErrorLog - Whether to send to error logging service
 */
export const error = (source, error, context = {}, sendToErrorLog = false) => {
  console.error(`[${source}] Error:`, error);
  console.error('Context:', context);
  
  // Optionally send to error logging service
  if (sendToErrorLog) {
    import('./logError').then(({ default: logError }) => {
      logError(source, error, context);
    }).catch(err => {
      console.error('Failed to log error to service:', err);
    });
  }
  
  return error; // Return the error for chaining
};

/**
 * Track execution time of a function
 * @param {string} label - Label for the timing
 * @param {Function} fn - Function to execute and time
 * @returns {any} - Return value from the function
 */
export const timeExecution = async (label, fn) => {
  if (!DEBUG_ENABLED) return fn();
  
  console.time(`⏱️ ${label}`);
  try {
    const result = await fn();
    return result;
  } finally {
    console.timeEnd(`⏱️ ${label}`);
  }
};

export default {
  debug,
  info,
  warn,
  error,
  timeExecution,
  LEVELS
};