import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // App
  APP_NAME: Joi.string().required().default('MyApp'),
  DESCRIPTION: Joi.string()
    .default('A NestJS production application')
    .optional(),
  PORT: Joi.number().default(9001),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  APP_URL: Joi.string().default('http://localhost:3000'),

  // Database
  DATABASE_URL: Joi.string().required(),

  // JWT
  JWT_SECRET: Joi.string().required().min(32),
  REFRESH_SECRET: Joi.string().required().min(32),

  // Redis
  REDIS_HOST: Joi.string().default('127.0.0.1'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_TLS: Joi.boolean().default(false),

  // CORS
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),

  // Throttle
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(10),

  // Email (Resend)
  RESEND_API_KEY: Joi.string().allow('').optional(),
  RESEND_FROM: Joi.string().default('noreply@yourapp.com'),

  // File uploads
  FILE_STORAGE: Joi.string().valid('local', 's3').default('local'),
  UPLOAD_DIR: Joi.string().default('./uploads'),
  MAX_FILE_SIZE: Joi.number().default(10 * 1024 * 1024),

  // S3 (required only when FILE_STORAGE=s3)
  AWS_REGION: Joi.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: Joi.string().allow('').optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().allow('').optional(),
  S3_BUCKET: Joi.string().allow('').optional(),
});

export default () => ({
  app: {
    name: process.env.APP_NAME || 'MyApp',
    description: process.env.DESCRIPTION || 'A NestJS production application',
    port: parseInt(process.env.PORT || '9001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    url: process.env.APP_URL || 'http://localhost:3000',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.REFRESH_SECRET,
  },
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true',
  },
  cors: {
    origins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
      : ['http://localhost:3000'],
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '10', 10),
  },
  mail: {
    resendApiKey: process.env.RESEND_API_KEY || undefined,
    from: process.env.RESEND_FROM || 'noreply@yourapp.com',
  },
  upload: {
    storage: process.env.FILE_STORAGE || 'local',
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || `${10 * 1024 * 1024}`, 10),
  },
  s3: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || undefined,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || undefined,
    bucket: process.env.S3_BUCKET || undefined,
  },
});
