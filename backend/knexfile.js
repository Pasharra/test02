require('dotenv').config();

module.exports = {
  development: {
    client: 'pg',
    connection: process.env.POSTGRES_CONNECTION_STRING,
    migrations: {
      directory: './db/migrations'
    }
  }
  // You can add production/test configs as needed
};