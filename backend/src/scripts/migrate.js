const { exec } = require('child_process');
const { PrismaClient } = require('@prisma/client');

async function runMigrations() {
  console.log('Running database migrations...');
  
  exec('npx prisma migrate deploy', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error running migrations: ${error}`);
      process.exit(1);
    }
    console.log(stdout);
    console.error(stderr);
    
    console.log('Migrations completed successfully!');
    process.exit(0);
  });
}

runMigrations();
