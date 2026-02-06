import { config as dotenvConfig } from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: resolve(__dirname, '..', '.env') });

const REQUIRED = [
  'KOINOR_SERVER',
  'KOINOR_DATABASE',
  'KOINOR_USER',
  'KOINOR_PASSWORD',
  'RAILWAY_SYNC_URL',
  'SYNC_API_KEY',
];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[CONFIG ERROR] Variables de entorno faltantes: ${missing.join(', ')}`);
  console.error('Copie .env.example a .env y configure los valores requeridos.');
  process.exit(1);
}

const config = {
  // SQL Server
  KOINOR_SERVER: process.env.KOINOR_SERVER,
  KOINOR_PORT: parseInt(process.env.KOINOR_PORT || '1433', 10),
  KOINOR_DATABASE: process.env.KOINOR_DATABASE,
  KOINOR_USER: process.env.KOINOR_USER,
  KOINOR_PASSWORD: process.env.KOINOR_PASSWORD,

  // Railway
  RAILWAY_SYNC_URL: process.env.RAILWAY_SYNC_URL,
  SYNC_API_KEY: process.env.SYNC_API_KEY,

  // Sync schedule
  SYNC_INTERVAL_MINUTES: parseInt(process.env.SYNC_INTERVAL_MINUTES || '10', 10),
  SYNC_ACTIVE_HOUR_START: parseInt(process.env.SYNC_ACTIVE_HOUR_START || '8', 10),
  SYNC_ACTIVE_HOUR_END: parseInt(process.env.SYNC_ACTIVE_HOUR_END || '18', 10),

  // Advanced
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE || '500', 10),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Derived paths
  ROOT_DIR: resolve(__dirname, '..'),
};

export default config;
