// Sequelize CLI + runtime database configuration.
// CommonJS on purpose - this file is loaded directly by `sequelize-cli`
// (a plain Node process outside the Next.js build) as well as by our
// own connection.js at runtime.
require("dotenv").config({ path: ".env.local" });
require("dotenv").config(); // fallback to .env if .env.local is absent

const base = {
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || null,
  database: process.env.DB_NAME || "crm_platform",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  dialect: process.env.DB_DIALECT || "mysql",
  logging: false,
  define: {
    underscored: true,
    paranoid: false, // enabled per-model where soft delete is required
  },
};

module.exports = {
  development: base,
  test: { ...base, database: `${base.database}_test` },
  production: { ...base, logging: false },
};
