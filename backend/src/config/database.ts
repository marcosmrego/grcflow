import { Pool } from 'pg';
import { config } from './index';

const pool = new Pool(config.database);

export const db = {
  query: (text: string, params?: any[]) => {
    return pool.query(text, params);
  },
  getClient: () => pool.connect(),
};

export default pool;
