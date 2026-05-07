const isDevelopment = process.env.NODE_ENV !== "production";

const getRuntime = () => (typeof window === "undefined" ? "server" : "client");

const serializeError = (error) => {
  if (!error) {
    return null;
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack || null,
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  return {
    message: "Non-Error value thrown",
    details: error,
  };
};

const getConsoleMethod = (level) => {
  if (level === "error") return "error";
  if (level === "warn") return "warn";
  if (level === "debug") return "debug";
  return "info";
};

const shouldWriteToConsole = (level) => {
  if (isDevelopment) {
    return true;
  }

  return getRuntime() === "server" && (level === "error" || level === "warn");
};

const getGlobalTransport = () => {
  if (typeof globalThis === "undefined") {
    return null;
  }

  const transport = globalThis.__AVANTI_REMOTE_LOGGER_TRANSPORT__;
  return typeof transport === "function" ? transport : null;
};

class Logger {
  constructor() {
    this.transport = null;
  }

  setTransport(transport) {
    this.transport = typeof transport === "function" ? transport : null;
  }

  log(level, message, error = null, context = null) {
    const entry = {
      level,
      message,
      context: context || null,
      error: serializeError(error),
      runtime: getRuntime(),
      timestamp: new Date().toISOString(),
    };

    if (shouldWriteToConsole(level)) {
      const consoleMethod = getConsoleMethod(level);
      const prefix = `[${level.toUpperCase()}] ${message}`;

      if (entry.error || entry.context) {
        console[consoleMethod](prefix, {
          error: entry.error,
          context: entry.context,
        });
      } else {
        console[consoleMethod](prefix);
      }
    }

    const transport = this.transport || getGlobalTransport();
    if (transport) {
      try {
        transport(entry);
      } catch (transportError) {
        if (isDevelopment) {
          console.error("[LOGGER] Remote transport failed.", transportError);
        }
      }
    }

    return entry;
  }

  error(message, error = null, context = null) {
    return this.log("error", message, error, context);
  }

  warn(message, context = null) {
    return this.log("warn", message, null, context);
  }

  info(message, context = null) {
    return this.log("info", message, null, context);
  }

  debug(message, context = null) {
    return this.log("debug", message, null, context);
  }
}

const logger = new Logger();

export default logger;
