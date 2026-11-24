/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // Sequelize (and its mysql2 driver) must run as real Node modules rather
  // than being bundled by Turbopack: Sequelize's data-types module touches
  // every dialect's package at module-eval time (postgres/mssql/sqlite),
  // which otherwise fails to bundle since we only install mysql2.
  // File uploads (documents up to 15 MB) travel in server actions; the default limit is 1 MB.
  experimental: { serverActions: { bodySizeLimit: "16mb" } },
  serverExternalPackages: ["sequelize", "mysql2", "bcryptjs"],
};

export default nextConfig;
