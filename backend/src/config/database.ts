import { Pool } from 'pg';
import { config } from './index';

const { schema, ...poolConfig } = config.database;

const pool = new Pool(poolConfig);

// Define o search_path em cada nova conexão para isolar no schema grc_flow
pool.on('connect', (client) => {
  client.query(`SET search_path TO ${schema}, public`);
});

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
  getClient: () => pool.connect(),
};

export default pool;
