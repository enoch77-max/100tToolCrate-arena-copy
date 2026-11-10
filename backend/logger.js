const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

export function createLogger(level = 'info') {
  const threshold = LEVELS[level] || LEVELS.info;
  function write(name, message, details = {}) {
    if ((LEVELS[name] || 0) < threshold) return;
    const record = { time: new Date().toISOString(), level: name, message, ...details };
    const output = `${JSON.stringify(record)}\n`;
    if (name === 'error' || name === 'warn') process.stderr.write(output);
    else process.stdout.write(output);
  }
  return {
    debug: (message, details) => write('debug', message, details),
    info: (message, details) => write('info', message, details),
    warn: (message, details) => write('warn', message, details),
    error: (message, details) => write('error', message, details)
  };
}
