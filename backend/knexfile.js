require('dotenv').config();

module.exports = {
  development: {
    client: 'pg',
    connection: process.env.POSTGRES_CONNECTION_STRING,
    migrations: {
      directory: './db/migrations'
    },
    pool: {
      min: 5,
      max: 20,
      acquireTimeoutMillis: 60000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100,
      propagateCreateError: false
    },
    debug: true
  }
  // You can add production/test configs as needed
};