export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  host: process.env.HOST || "0.0.0.0",

  // Database
  databaseUrl: process.env.DATABASE_URL || "postgresql://taskflow:taskflow@localhost:5432/taskflow",

  // Auth
  jwtSecret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || "dev-secret",
  sessionCookieName: "session-token",

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",

  // S3 / MinIO
  s3Endpoint: process.env.S3_ENDPOINT || "http://minio:9000",
  s3Bucket: process.env.S3_BUCKET || "taskflow",
  s3AccessKey: process.env.S3_ACCESS_KEY || "taskflow",
  s3SecretKey: process.env.S3_SECRET_KEY || "taskflow123",
  s3Region: process.env.S3_REGION || "us-east-1",

  // App
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  mainDomain: process.env.NEXT_PUBLIC_MAIN_DOMAIN || "localhost",

  // Email
  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "notifications@taskflow.dev",

  // AI
  geminiApiKey: process.env.GEMINI_API_KEY || "",

  // Cron
  cronApiKey: process.env.CRON_API_KEY || "",
};
