-- Database Schema for Obra Check
-- Generated for MySQL

SET FOREIGN_KEY_CHECKS=0;

-- 1. Projects
DROP TABLE IF EXISTS `projects`;
CREATE TABLE `projects` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255),
  `client` VARCHAR(255),
  `clientEmail` VARCHAR(255),
  `clientPhone` VARCHAR(255),
  `clientType` VARCHAR(50),
  `address` TEXT,
  `projectType` VARCHAR(100),
  `areaM2` DECIMAL(10,2),
  `areaMl` DECIMAL(10,2),
  `costoDirecto` DECIMAL(15,2),
  `gastosGeneralesPorc` DECIMAL(5,2),
  `utilidadPorc` DECIMAL(5,2),
  `startDate` DATE,
  `endDate` DATE,
  `location` VARCHAR(255),
  `resident` VARCHAR(255),
  `value` DECIMAL(15,2),
  `balance` DECIMAL(15,2),
  `status` VARCHAR(50),
  `progress` INT,
  `description` TEXT
);

-- 2. Inventory
DROP TABLE IF EXISTS `inventory`;
CREATE TABLE `inventory` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `projectId` VARCHAR(50),
  `name` VARCHAR(255),
  `category` VARCHAR(100),
  `quantity` DECIMAL(15,2),
  `unit` VARCHAR(50),
  `status` VARCHAR(50),
  `date` DATE,
  `minStock` DECIMAL(15,2),
  `supplierId` VARCHAR(50)
);

-- 3. Transactions
DROP TABLE IF EXISTS `transactions`;
CREATE TABLE `transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `projectId` VARCHAR(50),
  `type` VARCHAR(50),
  `category` VARCHAR(100),
  `amount` DECIMAL(15,2),
  `date` DATE,
  `description` TEXT
);

-- 4. Workers
DROP TABLE IF EXISTS `workers`;
CREATE TABLE `workers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255),
  `role` VARCHAR(100),
  `documentNumber` VARCHAR(50),
  `dailyRate` DECIMAL(10,2),
  `photo` LONGTEXT,
  `projectId` VARCHAR(50),
  `status` VARCHAR(50)
);

-- 5. Users
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255),
  `username` VARCHAR(100),
  `role` VARCHAR(100),
  `email` VARCHAR(255),
  `status` VARCHAR(50),
  `password` VARCHAR(255),
  `projectId` VARCHAR(50),
  `forcePasswordChange` BOOLEAN DEFAULT 0
);

-- Default Admin User
INSERT INTO `users` (`name`, `username`, `role`, `email`, `status`, `password`, `forcePasswordChange`) VALUES
('Administrador', 'admin', 'Administrador General', 'admin@example.com', 'Activo', '123456', 1);

-- 6. Clients
DROP TABLE IF EXISTS `clients`;
CREATE TABLE `clients` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255),
  `email` VARCHAR(255),
  `phone` VARCHAR(50),
  `address` TEXT,
  `type` VARCHAR(50)
);

-- 7. Suppliers
DROP TABLE IF EXISTS `suppliers`;
CREATE TABLE `suppliers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255),
  `contact` VARCHAR(255),
  `phone` VARCHAR(50),
  `email` VARCHAR(255),
  `address` TEXT
);

-- 8. Payrolls
DROP TABLE IF EXISTS `payrolls`;
CREATE TABLE `payrolls` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `projectId` VARCHAR(50),
  `startDate` DATE,
  `endDate` DATE,
  `totalAmount` DECIMAL(15,2),
  `status` VARCHAR(50),
  `details` JSON
);

-- 9. DailyLogs
DROP TABLE IF EXISTS `dailyLogs`;
CREATE TABLE `dailyLogs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `projectId` VARCHAR(50),
  `date` DATE,
  `activities` TEXT,
  `incidents` TEXT,
  `weather` VARCHAR(100),
  `photos` JSON,
  `usedMaterials` JSON
);

-- 10. Attendance
DROP TABLE IF EXISTS `attendance`;
CREATE TABLE `attendance` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `projectId` VARCHAR(50),
  `dailyLogId` INT,
  `workerId` INT,
  `workerName` VARCHAR(255),
  `workerRole` VARCHAR(100),
  `date` DATE,
  `status` VARCHAR(50),
  `notes` TEXT
);

-- 11. Categories
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255),
  `type` VARCHAR(50),
  `classification` VARCHAR(100)
);

-- 12. Loans
DROP TABLE IF EXISTS `loans`;
CREATE TABLE `loans` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `entity` VARCHAR(255),
  `type` VARCHAR(50),
  `amount` DECIMAL(15,2),
  `date` DATE,
  `dueDate` DATE,
  `status` VARCHAR(50),
  `description` TEXT,
  `installments` INT,
  `interestRate` DECIMAL(5,2)
);

-- 13. InventoryMovements
DROP TABLE IF EXISTS `inventoryMovements`;
CREATE TABLE `inventoryMovements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `projectId` VARCHAR(50),
  `inventoryId` INT,
  `itemName` VARCHAR(255),
  `type` VARCHAR(50),
  `quantity` DECIMAL(15,2),
  `unit` VARCHAR(50),
  `date` DATETIME,
  `reference` VARCHAR(255),
  `notes` TEXT,
  `user` VARCHAR(100)
);

-- 14. Returns
DROP TABLE IF EXISTS `returns`;
CREATE TABLE `returns` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `projectId` VARCHAR(50),
  `name` VARCHAR(255),
  `receiver` VARCHAR(255),
  `dateOut` DATE,
  `quantity` DECIMAL(15,2),
  `unit` VARCHAR(50),
  `status` VARCHAR(50)
);

-- 15. Roles
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255),
  `description` TEXT,
  `permissions` JSON,
  `status` VARCHAR(50)
);

-- 16. Settings
DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(255),
  `value` LONGTEXT
);

-- 17. WorkerRoles
DROP TABLE IF EXISTS `workerRoles`;
CREATE TABLE `workerRoles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255)
);

-- 18. AuditLogs
DROP TABLE IF EXISTS `auditLogs`;
CREATE TABLE `auditLogs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tableName` VARCHAR(100),
  `recordId` VARCHAR(50),
  `action` VARCHAR(50),
  `userId` INT,
  `username` VARCHAR(100),
  `timestamp` DATETIME,
  `details` TEXT
);

SET FOREIGN_KEY_CHECKS=1;
