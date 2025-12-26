import { db } from '../db/db';
import toast from 'react-hot-toast';

let autoSyncInterval: NodeJS.Timeout | null = null;
let isSyncing = false;

const getDbConfig = async () => {
  const keys = ['remote_db_host', 'remote_db_port', 'remote_db_user', 'remote_db_password', 'remote_db_name', 'remote_api_url'];
  const settings = await db.settings.where('key').anyOf(keys).toArray();
  return {
    host: settings.find(s => s.key === 'remote_db_host')?.value || '',
    port: settings.find(s => s.key === 'remote_db_port')?.value || '3306',
    user: settings.find(s => s.key === 'remote_db_user')?.value || '',
    password: settings.find(s => s.key === 'remote_db_password')?.value || '',
    database: settings.find(s => s.key === 'remote_db_name')?.value || '',
    apiUrl: settings.find(s => s.key === 'remote_api_url')?.value || ''
  };
};

const generateMySQLDump = async () => {
  const escape = (val: any) => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return val;
    if (typeof val === 'boolean') return val ? 1 : 0;
    if (typeof val === 'object') {
      if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
      return `'${JSON.stringify(val).replace(/'/g, "\\'")}'`;
    }
    return `'${String(val).replace(/'/g, "\\'")}'`;
  };

  try {
    let sql = "-- Database export for MySQL\n";
    sql += "-- Generated on " + new Date().toISOString() + "\n\n";
    sql += "SET FOREIGN_KEY_CHECKS=0;\n\n";

    // Helper to generate table dump
    const dumpTable = async (tableName: string, dexieTable: any, createTableSql: string, columns: string[]) => {
      let chunk = `-- Table: ${tableName}\n`;
      chunk += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
      chunk += createTableSql;
      
      const data = await dexieTable.toArray();
      if (data.length > 0) {
        chunk += `INSERT INTO \`${tableName}\` (\`${columns.join("`, `")}\`) VALUES \n`;
        chunk += data.map((row: any) => {
          const values = columns.map(col => {
             // Handle some special mappings if needed, but mostly direct mapping
             return escape(row[col]);
          });
          return `(${values.join(", ")})`;
        }).join(",\n") + ";\n\n";
      }
      return chunk;
    };

    // 1. Projects
    sql += await dumpTable('projects', db.projects, 
      "CREATE TABLE `projects` (\n" +
      "  `id` INT AUTO_INCREMENT PRIMARY KEY,\n" +
      "  `name` VARCHAR(255),\n" +
      "  `client` VARCHAR(255),\n" +
      "  `clientEmail` VARCHAR(255),\n" +
      "  `clientPhone` VARCHAR(255),\n" +
      "  `clientType` VARCHAR(50),\n" +
      "  `address` TEXT,\n" +
      "  `projectType` VARCHAR(100),\n" +
      "  `areaM2` DECIMAL(10,2),\n" +
      "  `areaMl` DECIMAL(10,2),\n" +
      "  `costoDirecto` DECIMAL(15,2),\n" +
      "  `gastosGeneralesPorc` DECIMAL(5,2),\n" +
      "  `utilidadPorc` DECIMAL(5,2),\n" +
      "  `startDate` DATE,\n" +
      "  `endDate` DATE,\n" +
      "  `location` VARCHAR(255),\n" +
      "  `resident` VARCHAR(255),\n" +
      "  `value` DECIMAL(15,2),\n" +
      "  `balance` DECIMAL(15,2),\n" +
      "  `status` VARCHAR(50),\n" +
      "  `progress` INT,\n" +
      "  `description` TEXT\n" +
      ");\n",
      ['id', 'name', 'client', 'clientEmail', 'clientPhone', 'clientType', 'address', 'projectType', 'areaM2', 'areaMl', 'costoDirecto', 'gastosGeneralesPorc', 'utilidadPorc', 'startDate', 'endDate', 'location', 'resident', 'value', 'balance', 'status', 'progress', 'description']
    );

    // 2. Inventory
    sql += await dumpTable('inventory', db.inventory,
      "CREATE TABLE `inventory` (\n" +
      "  `id` INT AUTO_INCREMENT PRIMARY KEY,\n" +
      "  `projectId` VARCHAR(50),\n" +
      "  `name` VARCHAR(255),\n" +
      "  `category` VARCHAR(100),\n" +
      "  `quantity` DECIMAL(15,2),\n" +
      "  `unit` VARCHAR(50),\n" +
      "  `status` VARCHAR(50),\n" +
      "  `date` DATE,\n" +
      "  `minStock` DECIMAL(15,2),\n" +
      "  `supplierId` VARCHAR(50)\n" +
      ");\n",
      ['id', 'projectId', 'name', 'category', 'quantity', 'unit', 'status', 'date', 'minStock', 'supplierId']
    );

    // 3. Transactions
    sql += await dumpTable('transactions', db.transactions,
      "CREATE TABLE `transactions` (\n" +
      "  `id` INT AUTO_INCREMENT PRIMARY KEY,\n" +
      "  `projectId` VARCHAR(50),\n" +
      "  `type` VARCHAR(50),\n" +
      "  `category` VARCHAR(100),\n" +
      "  `amount` DECIMAL(15,2),\n" +
      "  `date` DATE,\n" +
      "  `description` TEXT\n" +
      ");\n",
      ['id', 'projectId', 'type', 'category', 'amount', 'date', 'description']
    );

    // 4. Workers
    sql += await dumpTable('workers', db.workers,
      "CREATE TABLE `workers` (\n" +
      "  `id` INT AUTO_INCREMENT PRIMARY KEY,\n" +
      "  `name` VARCHAR(255),\n" +
      "  `role` VARCHAR(100),\n" +
      "  `documentNumber` VARCHAR(50),\n" +
      "  `dailyRate` DECIMAL(10,2),\n" +
      "  `photo` LONGTEXT,\n" +
      "  `projectId` VARCHAR(50),\n" +
      "  `status` VARCHAR(50)\n" +
      ");\n",
      ['id', 'name', 'role', 'documentNumber', 'dailyRate', 'photo', 'projectId', 'status']
    );

    // 5. Users
    sql += await dumpTable('users', db.users,
      "CREATE TABLE `users` (\n" +
      "  `id` INT AUTO_INCREMENT PRIMARY KEY,\n" +
      "  `name` VARCHAR(255),\n" +
      "  `username` VARCHAR(100),\n" +
      "  `role` VARCHAR(100),\n" +
      "  `email` VARCHAR(255),\n" +
      "  `status` VARCHAR(50),\n" +
      "  `password` VARCHAR(255),\n" +
      "  `projectId` VARCHAR(50)\n" +
      ");\n",
      ['id', 'name', 'username', 'role', 'email', 'status', 'password', 'projectId']
    );

    // 6. Clients
    sql += await dumpTable('clients', db.clients,
      "CREATE TABLE `clients` (\n" +
      "  `id` INT AUTO_INCREMENT PRIMARY KEY,\n" +
      "  `name` VARCHAR(255),\n" +
      "  `email` VARCHAR(255),\n" +
      "  `phone` VARCHAR(50),\n" +
      "  `address` TEXT,\n" +
      "  `type` VARCHAR(50)\n" +
      ");\n",
      ['id', 'name', 'email', 'phone', 'address', 'type']
    );

    // 7. Suppliers
    sql += await dumpTable('suppliers', db.suppliers,
      "CREATE TABLE `suppliers` (\n" +
      "  `id` INT AUTO_INCREMENT PRIMARY KEY,\n" +
      "  `name` VARCHAR(255),\n" +
      "  `contact` VARCHAR(255),\n" +
      "  `phone` VARCHAR(50),\n" +
      "  `email` VARCHAR(255),\n" +
      "  `address` TEXT\n" +
      ");\n",
      ['id', 'name', 'contact', 'phone', 'email', 'address']
    );

    // 8. Payrolls
    sql += await dumpTable('payrolls', db.payrolls,
      "CREATE TABLE `payrolls` (\n" +
      "  `id` INT AUTO_INCREMENT PRIMARY KEY,\n" +
      "  `projectId` VARCHAR(50),\n" +
      "  `startDate` DATE,\n" +
      "  `endDate` DATE,\n" +
      "  `totalAmount` DECIMAL(15,2),\n" +
      "  `status` VARCHAR(50),\n" +
      "  `details` JSON\n" +
      ");\n",
      ['id', 'projectId', 'startDate', 'endDate', 'totalAmount', 'status', 'details']
    );

    // 9. DailyLogs
    sql += await dumpTable('dailyLogs', db.dailyLogs,
      "CREATE TABLE `dailyLogs` (\n" +
      "  `id` INT AUTO_INCREMENT PRIMARY KEY,\n" +
      "  `projectId` VARCHAR(50),\n" +
      "  `date` DATE,\n" +
      "  `activities` TEXT,\n" +
      "  `incidents` TEXT,\n" +
      "  `weather` VARCHAR(100),\n" +
      "  `photos` JSON,\n" +
      "  `usedMaterials` JSON\n" +
      ");\n",
      ['id', 'projectId', 'date', 'activities', 'incidents', 'weather', 'photos', 'usedMaterials']
    );

    // 10. Attendance
    sql += await dumpTable('attendance', db.attendance,
      "CREATE TABLE `attendance` (\n" +
      "  `id` INT AUTO_INCREMENT PRIMARY KEY,\n" +
      "  `projectId` VARCHAR(50),\n" +
      "  `dailyLogId` INT,\n" +
      "  `workerId` INT,\n" +
      "  `workerName` VARCHAR(255),\n" +
      "  `workerRole` VARCHAR(100),\n" +
      "  `date` DATE,\n" +
      "  `status` VARCHAR(50),\n" +
      "  `notes` TEXT\n" +
      ");\n",
      ['id', 'projectId', 'dailyLogId', 'workerId', 'workerName', 'workerRole', 'date', 'status', 'notes']
    );

    // 11. Categories
    sql += await dumpTable('categories', db.categories,
      "CREATE TABLE `categories` (\n" +
      "  `id` INT AUTO_INCREMENT PRIMARY KEY,\n" +
      "  `name` VARCHAR(255),\n" +
      "  `type` VARCHAR(50),\n" +
      "  `classification` VARCHAR(100)\n" +
      ");\n",
      ['id', 'name', 'type', 'classification']
    );

    // 12. Loans
    sql += await dumpTable('loans', db.loans,
      "CREATE TABLE `loans` (\n" +
      "  `id` INT AUTO_INCREMENT PRIMARY KEY,\n" +
      "  `entity` VARCHAR(255),\n" +
      "  `type` VARCHAR(50),\n" +
      "  `amount` DECIMAL(15,2),\n" +
      "  `date` DATE,\n" +
      "  `dueDate` DATE,\n" +
      "  `status` VARCHAR(50),\n" +
      "  `description` TEXT,\n" +
      "  `installments` INT,\n" +
      "  `interestRate` DECIMAL(5,2)\n" +
      ");\n",
      ['id', 'entity', 'type', 'amount', 'date', 'dueDate', 'status', 'description', 'installments', 'interestRate']
    );

    // 13. InventoryMovements
    sql += await dumpTable('inventoryMovements', db.inventoryMovements,
      "CREATE TABLE `inventoryMovements` (\n" +
      "  `id` INT AUTO_INCREMENT PRIMARY KEY,\n" +
      "  `projectId` VARCHAR(50),\n" +
      "  `inventoryId` INT,\n" +
      "  `itemName` VARCHAR(255),\n" +
      "  `type` VARCHAR(50),\n" +
      "  `quantity` DECIMAL(15,2),\n" +
      "  `unit` VARCHAR(50),\n" +
      "  `date` DATETIME,\n" +
      "  `reference` VARCHAR(255),\n" +
      "  `notes` TEXT,\n" +
      "  `user` VARCHAR(100)\n" +
      ");\n",
      ['id', 'projectId', 'inventoryId', 'itemName', 'type', 'quantity', 'unit', 'date', 'reference', 'notes', 'user']
    );

    // 14. Returns
    sql += await dumpTable('returns', db.returns,
      "CREATE TABLE `returns` (\n" +
      "  `id` INT AUTO_INCREMENT PRIMARY KEY,\n" +
      "  `projectId` VARCHAR(50),\n" +
      "  `name` VARCHAR(255),\n" +
      "  `receiver` VARCHAR(255),\n" +
      "  `dateOut` DATE,\n" +
      "  `quantity` DECIMAL(15,2),\n" +
      "  `unit` VARCHAR(50),\n" +
      "  `status` VARCHAR(50)\n" +
      ");\n",
      ['id', 'projectId', 'name', 'receiver', 'dateOut', 'quantity', 'unit', 'status']
    );

    // 15. Roles
    sql += await dumpTable('roles', db.roles,
      "CREATE TABLE `roles` (\n" +
      "  `id` INT AUTO_INCREMENT PRIMARY KEY,\n" +
      "  `name` VARCHAR(255),\n" +
      "  `description` TEXT,\n" +
      "  `permissions` JSON,\n" +
      "  `status` VARCHAR(50)\n" +
      ");\n",
      ['id', 'name', 'description', 'permissions', 'status']
    );

    // 16. Settings
    sql += await dumpTable('settings', db.settings,
      "CREATE TABLE `settings` (\n" +
      "  `id` INT AUTO_INCREMENT PRIMARY KEY,\n" +
      "  `key` VARCHAR(255),\n" +
      "  `value` LONGTEXT\n" +
      ");\n",
      ['id', 'key', 'value']
    );

    // 17. WorkerRoles
    sql += await dumpTable('workerRoles', db.workerRoles,
      "CREATE TABLE `workerRoles` (\n" +
      "  `id` INT AUTO_INCREMENT PRIMARY KEY,\n" +
      "  `name` VARCHAR(255)\n" +
      ");\n",
      ['id', 'name']
    );

    sql += "SET FOREIGN_KEY_CHECKS=1;\n";

    return sql;
  } catch (error) {
    console.error('Error generating SQL:', error);
    throw error;
  }
};

export const SyncService = {
  generateDump: async () => {
    return await generateMySQLDump();
  },

  pushToRemote: async (showToast = true) => {
    if (isSyncing) {
      if (showToast) toast('Sincronización en progreso...');
      return;
    }
    const config = await getDbConfig();
    
    if (!config.apiUrl) {
      if (showToast) toast.error('Configure la URL del API Bridge');
      return;
    }

    if (config.apiUrl.includes('zaylek.com')) {
      console.warn('Using placeholder API URL (zaylek.com). Sync is expected to fail if this is not a real server.');
    }

    isSyncing = true;
    const toastId = showToast ? toast.loading('Sincronizando (Subida)...') : undefined;

    try {
      const sql = await generateMySQLDump();
      
      if (!sql) {
          if (toastId) toast.dismiss(toastId);
          isSyncing = false;
          return;
      }

      const payload = {
        action: 'execute_sql',
        host: config.host,
        user: config.user,
        password: config.password,
        database: config.database,
        port: config.port,
        sql: sql
      };

      const payloadString = JSON.stringify(payload);
      const sizeMb = payloadString.length / (1024 * 1024);
      console.log(`Sync Payload Size: ${sizeMb.toFixed(2)} MB`);

      if (sizeMb > 8) {
        console.warn('Payload is large (> 8MB). Server might reject it.');
        if (showToast) toast('Advertencia: El tamaño de los datos es grande, podría fallar si el servidor tiene límites bajos.', { icon: '⚠️' });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

      try {
        const response = await fetch(config.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: payloadString,
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await response.json();
        if (toastId) toast.dismiss(toastId);

        if (data.success) {
            if (showToast) toast.success('¡Sincronización completada!');
            console.log('Auto-sync successful');
        } else {
            console.error('Sync error response:', data);
            if (showToast) toast.error('Error en la subida remota: ' + (data.message || 'Error desconocido'));
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Tiempo de espera agotado (Timeout) al conectar con el servidor.');
        }
        throw fetchError;
      }

    } catch (error: any) {
       if (toastId) toast.dismiss(toastId);
       
       // Detailed logging
       console.error('Sync process failed:', error);
       if (config.apiUrl && config.apiUrl.includes('zaylek.com')) {
           console.info('Tip: The error is likely because "https://zaylek.com/api.php" is a placeholder or unreachable.');
       }
       
       const errorMessage = error.message || 'Error desconocido';
       
       if (showToast) {
         if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
           toast.error('Error de conexión: No se pudo contactar al servidor.');
         } else {
           toast.error(`Error al sincronizar: ${errorMessage}`);
         }
       }
    } finally {
        isSyncing = false;
    }
  },

  pullFromRemote: async (providedConfig: any = null) => {
    if (isSyncing) {
        toast('Sincronización en progreso...');
        return false;
    }

    const config = providedConfig || await getDbConfig();
    
    if (!config.apiUrl) {
        toast.error('Configure la URL del API Bridge');
        return false;
    }

    // Note: The caller (UI) should handle the confirmation dialog
    
    isSyncing = true;
    const toastId = toast.loading('Descargando datos del servidor...');

    try {
        const tables = [
            { name: 'projects', db: db.projects },
            { name: 'inventory', db: db.inventory },
            { name: 'inventoryMovements', db: db.inventoryMovements },
            { name: 'transactions', db: db.transactions },
            { name: 'suppliers', db: db.suppliers },
            { name: 'returns', db: db.returns },
            { name: 'categories', db: db.categories },
            { name: 'users', db: db.users },
            { name: 'roles', db: db.roles, jsonFields: ['permissions'] },
            { name: 'workers', db: db.workers },
            { name: 'workerRoles', db: db.workerRoles },
            { name: 'payrolls', db: db.payrolls, jsonFields: ['details'] },
            { name: 'loans', db: db.loans },
            { name: 'clients', db: db.clients },
            { name: 'dailyLogs', db: db.dailyLogs, jsonFields: ['photos', 'usedMaterials'] },
            { name: 'attendance', db: db.attendance },
            { name: 'settings', db: db.settings }
        ];

        // Step 1: Fetch all data
        const fetchedData: Record<string, any[]> = {};
        
        for (const table of tables) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s per table

            try {
                const response = await fetch(config.apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'query',
                        host: config.host,
                        user: config.user,
                        password: config.password,
                        database: config.database,
                        port: config.port,
                        sql: `SELECT * FROM ${table.name}`
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                const result = await response.json();
                if (!result.success) {
                    // If "Table doesn't exist", treat as empty
                    if (result.message && (result.message.includes("doesn't exist") || result.message.includes("no existe"))) {
                        fetchedData[table.name] = [];
                    } else {
                        throw new Error(`Error descargando tabla ${table.name}: ${result.message}`);
                    }
                } else {
                    fetchedData[table.name] = result.data;
                }
            } catch (err: any) {
                clearTimeout(timeoutId);
                throw err;
            }
        }

        // Step 2: Update Dexie
        await db.transaction('rw', tables.map(t => t.db), async () => {
            for (const table of tables) {
                const rows = fetchedData[table.name];
                await table.db.clear();
                
                if (rows && rows.length > 0) {
                    const processedRows = rows.map((row: any) => {
                        // Handle JSON fields
                        if (table.jsonFields) {
                            table.jsonFields.forEach((field: string) => {
                                if (row[field] && typeof row[field] === 'string') {
                                    try { 
                                        if (row[field].startsWith('{') || row[field].startsWith('[')) {
                                            row[field] = JSON.parse(row[field]); 
                                        }
                                    } catch(e) {
                                        // Keep as string if parse fails
                                    }
                                }
                            });
                        }
                        return row;
                    });
                    await (table.db as any).bulkAdd(processedRows);
                }
            }
        });

        toast.dismiss(toastId);
        toast.success('Sincronización (Descarga) completada');
        return true;

    } catch (error: any) {
        toast.dismiss(toastId);
        console.error('Sync error:', error);
        toast.error('Error al descargar: ' + (error.message || 'Desconocido'));
        isSyncing = false;
        return false;
    } finally {
        isSyncing = false;
    }
  },

  startAutoSync: (intervalMs = 5 * 60 * 1000) => {
    if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
    }
    
    // Initial sync check after 5 seconds
    setTimeout(() => {
        getDbConfig().then(config => {
            if (config.apiUrl) {
                console.log('Auto-sync initialized');
            }
        });
    }, 5000);

    // Setup network listeners for immediate sync
    const handleOnline = () => {
        console.log('Network restored, triggering immediate sync...');
        toast('Conexión restaurada. Sincronizando datos...', { icon: '🔄' });
        SyncService.pushToRemote(false);
    };

    window.addEventListener('online', handleOnline);

    // Store the listener reference to remove it later if needed
    // @ts-ignore
    SyncService._onlineHandler = handleOnline;

    autoSyncInterval = setInterval(() => {
        console.log('Triggering auto-sync...');
        SyncService.pushToRemote(false); // Silent sync
    }, intervalMs);
  },

  stopAutoSync: () => {
    if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
        autoSyncInterval = null;
    }
    // @ts-ignore
    if (SyncService._onlineHandler) {
        // @ts-ignore
        window.removeEventListener('online', SyncService._onlineHandler);
        // @ts-ignore
        SyncService._onlineHandler = null;
    }
  }
};
