import { Pool } from 'pg';

// Support both DATABASE_URL and individual connection parameters
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'bunty',
      user: process.env.DB_USER || 'bunty_user',
      password: process.env.DB_PASSWORD || 'secure_password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

console.log('Creating database pool with config:', {
  ...poolConfig,
  password: '***' // Hide password in logs
});

const pool = new Pool(poolConfig);

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit in development
  if (process.env.NODE_ENV === 'production') {
    process.exit(-1);
  }
});

pool.on('connect', () => {
  console.log('Database pool: New client connected');
});

export default pool;
