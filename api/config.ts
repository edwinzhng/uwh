// Copy this file to config.ts and update with your values

export const config = {
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database Configuration (Supabase)
  DATABASE_URL: process.env.DATABASE_URL || '',
  
  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3100',
  
  // Server Configuration
  PORT: parseInt(process.env.PORT || '3101'),
};
