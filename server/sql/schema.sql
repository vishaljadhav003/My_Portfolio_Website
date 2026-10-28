-- MySQL 8 / MariaDB 10.5+. Run once: npm run db:init
-- All timestamps are stored in UTC.

CREATE TABLE IF NOT EXISTS admins (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(60) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL,
  last_login_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  admin_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  INDEX idx_sessions_expires (expires_at),
  FOREIGN KEY (admin_id) REFERENCES admins (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inquiries (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  service VARCHAR(40) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  email_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  ip_hash CHAR(64) NULL,
  day DATE NOT NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_inquiries_status (status),
  INDEX idx_inquiries_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS visitors (
  visitor_id VARCHAR(64) NOT NULL PRIMARY KEY,
  first_seen DATETIME NOT NULL,
  last_seen DATETIME NOT NULL,
  views INT UNSIGNED NOT NULL DEFAULT 1,
  device VARCHAR(10) NOT NULL DEFAULT 'desktop',
  referrer VARCHAR(100) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS page_views (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  visitor_id VARCHAR(64) NOT NULL,
  path VARCHAR(200) NOT NULL,
  referrer VARCHAR(100) NULL,
  device VARCHAR(10) NOT NULL,
  day DATE NOT NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_views_day (day),
  INDEX idx_views_path (path)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS presence (
  visitor_id VARCHAR(64) NOT NULL PRIMARY KEY,
  path VARCHAR(200) NOT NULL,
  last_seen DATETIME NOT NULL,
  INDEX idx_presence_seen (last_seen)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clicks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  visitor_id VARCHAR(64) NOT NULL,
  label VARCHAR(80) NOT NULL,
  path VARCHAR(200) NOT NULL,
  day DATE NOT NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_clicks_day (day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS likes (
  visitor_id VARCHAR(64) NOT NULL PRIMARY KEY,
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS error_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  message VARCHAR(300) NOT NULL,
  source VARCHAR(200) NULL,
  line INT NULL,
  col INT NULL,
  stack TEXT NULL,
  path VARCHAR(200) NOT NULL,
  user_agent VARCHAR(200) NULL,
  day DATE NOT NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_errors_day (day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS search_stats (
  day DATE NOT NULL PRIMARY KEY,
  impressions INT UNSIGNED NOT NULL DEFAULT 0,
  clicks INT UNSIGNED NOT NULL DEFAULT 0,
  position DOUBLE NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
