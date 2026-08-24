import pino from 'pino';

export function createLogger(service: string) {
  return pino({
    name: service,
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    redact: ['req.headers.authorization', 'password', 'token', 'secret']
  });
}
