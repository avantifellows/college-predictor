const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
const env = process.env.NODE_ENV || 'development';
let transport = null;

export function setTransport(fn) {
  transport = fn;
}

function shouldLog(level) {
  // In production on the browser, avoid noisy logs. Allow errors to surface.
  if (env === 'production' && isBrowser) {
    return level === 'error';
  }
  return true;
}

function sendToTransport(level, args) {
  try {
    if (typeof transport === 'function') {
      transport(level, args);
    }
  } catch (e) {
    // swallow transport errors to avoid breaking application flow
  }
}

function log(level, ...args) {
  sendToTransport(level, args);
  if (!shouldLog(level)) return;
  const method = console[level] || console.log;
  try {
    method.apply(console, args);
  } catch (e) {
    // fallback
    console.log(...args);
  }
}

const logger = {
  debug: (...args) => log('debug', ...args),
  info: (...args) => log('info', ...args),
  warn: (...args) => log('warn', ...args),
  error: (...args) => log('error', ...args),
  setTransport,
};

export default logger;
