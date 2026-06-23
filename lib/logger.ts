type LogLevel = 'info' | 'warn' | 'error'

type LogContext = Record<string, unknown>

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return {
    message: typeof error === 'string' ? error : 'Unknown error',
    value: error,
  }
}

function writeLog(level: LogLevel, message: string, context?: LogContext, error?: unknown) {
  const payload: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    message,
  }

  if (context && Object.keys(context).length > 0) {
    payload.context = context
  }

  if (error !== undefined) {
    payload.error = normalizeError(error)
  }

  const serialized = JSON.stringify(payload)

  if (level === 'error') {
    console.error(serialized)
    return
  }

  if (level === 'warn') {
    console.warn(serialized)
    return
  }

  console.log(serialized)
}

export const logger = {
  info(message: string, context?: LogContext) {
    writeLog('info', message, context)
  },
  warn(message: string, context?: LogContext) {
    writeLog('warn', message, context)
  },
  error(message: string, error?: unknown, context?: LogContext) {
    writeLog('error', message, context, error)
  },
}
