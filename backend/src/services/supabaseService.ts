import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';
import { logger } from '../utils/logger';

let supabase: SupabaseClient<Database>;

export const initializeSupabase = () => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    throw new Error('Missing Supabase credentials');
  }

  supabase = createClient<Database>(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  return supabase;
};

export { supabase };

export class SupabaseService {
  static async validateToken(token: string): Promise<boolean> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error) {
        logger.error('Token validation error:', error);
        return false;
      }
      return !!user;
    } catch (error) {
      logger.error('Token validation error:', error);
      return false;
    }
  }

  static async getUserId(token: string): Promise<string | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        logger.error('Get user ID error:', error);
        return null;
      }
      return user.id;
    } catch (error) {
      logger.error('Get user ID error:', error);
      return null;
    }
  }
} 