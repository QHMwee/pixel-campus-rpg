-- 本機 MySQL 初始化。執行一次即可，之後用 drizzle 管理結構。
--   mysql -u root -p < init-db.sql
--   然後：pnpm db:push

CREATE DATABASE IF NOT EXISTS campus_quest
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'campus'@'localhost' IDENTIFIED BY 'campus';
GRANT ALL PRIVILEGES ON campus_quest.* TO 'campus'@'localhost';
FLUSH PRIVILEGES;
