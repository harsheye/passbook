import dotenv from 'dotenv';
// Load environment variables before importing app
dotenv.config({ override: true });

import app from './app';

const PORT = process.env.PORT || 5000;

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`  EXPENSE & GAMBLING TRACKER SERVER RUNNING`);
  console.log(`  PORT: ${PORT}`);
  console.log(`  ENV:  ${process.env.NODE_ENV || 'development'}`);
  console.log(`=========================================`);
});
