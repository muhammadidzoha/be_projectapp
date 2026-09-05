import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const parseDatabaseUrl = (url) => {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: u.port ? Number(u.port) : 3306,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, "").split("?")[0],
    };
  } catch (e) {
    return null;
  }
};

const databaseUrl = process.env.DATABASE_URL;
const parsed = databaseUrl ? parseDatabaseUrl(databaseUrl) : null;

const pool = mysql.createPool(
  parsed
    ? parsed
    : {
        host: process.env.DB_HOST || "localhost",
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || process.env.MYSQL_DATABASE || "health_app",
        connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 5,
        waitForConnections: true,
        queueLimit: 0,
        charset: "utf8mb4",
      },
);

export default pool;
