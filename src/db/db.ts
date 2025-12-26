import Dexie, { Table } from 'dexie';

// Define Interfaces
export interface Project {
  id?: number;
  name: string;
  client: string;
  clientEmail?: string;
  clientPhone?: string;
  clientType?: string;
  address?: string;
  projectType?: string;
  areaM2?: number;
  areaMl?: number;
  costoDirecto?: number;
  gastosGeneralesPorc?: number;
  utilidadPorc?: number;
  startDate?: string;
  endDate?: string;
  location?: string;
  resident?: string;
  value: number; // Numeric value
  balance: number; // Numeric balance
  status: string;
  progress?: number;
  description?: string;
}

export interface InventoryItem {
  id?: number;
  projectId: string; // keeping as string to match existing code, but could be number
  name: string;
  category: string;
  quantity: number;
  unit: string;
  status: string;
  date: string; // ISO Date string
  minStock?: number;
  supplierId?: string;
}

export interface Transaction {
  id?: number;
  projectId: string;
  type: 'Ingreso' | 'Gasto' | 'Almacen';
  category: string;
  amount: number;
  date: string;
  description: string;
}

export interface Supplier {
  id?: number;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  notes?: string;
}

export interface Return {
  id?: number;
  projectId: string;
  name: string;
  receiver: string;
  dateOut: string;
  quantity: number;
  unit: string;
  status: 'Pending' | 'Returned';
}

export interface Category {
  id?: number;
  name: string;
  type: 'income' | 'expense' | 'warehouse';
  classification: string;
}

export interface Loan {
  id?: number;
  entity: string; // Person or Bank
  type: 'Prestamo Otorgado' | 'Prestamo Recibido';
  amount: number;
  date: string;
  dueDate?: string;
  status: 'Pendiente' | 'Pagado' | 'Vencido';
  description?: string;
  installments?: number;
  interestRate?: number;
}

export interface Worker {
  id?: number;
  name: string;
  role: string; // e.g., Peon, Oficial, Operario
  documentNumber?: string;
  dailyRate?: number;
  photo?: string;
  projectId?: string;
  status: 'Activo' | 'Inactivo';
}

export interface Payroll {
  id?: number;
  projectId: string; // number as string to match others
  startDate: string;
  endDate: string;
  totalAmount: number;
  status: 'Borrador' | 'Aprobado' | 'Pagado';
  details: {
    workerId: number;
    workerName: string;
    role: string;
    daysWorked: number;
    amount: number; // Calculated or manual
    paymentMethod?: string; // e.g., Efectivo, Transferencia, Yape/Plin
    paymentProof?: string; // Base64 string of the image
  }[];
}

export interface User {
  id?: number;
  name: string;
  username: string;
  role: string;
  email: string;
  status: 'Activo' | 'Inactivo';
  password?: string;
  projectId?: string;
  forcePasswordChange?: boolean;
}

export interface UserRole {
  id?: number;
  name: string;
  description: string;
  permissions?: string[];
  status: 'Activo' | 'Inactivo';
}

export interface Setting {
  id?: number;
  key: string;
  value: any;
}

export interface WorkerRole {
  id?: number;
  name: string;
}

export interface Client {
  id?: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  type?: 'Persona' | 'Empresa';
}

export interface DailyLog {
  id?: number;
  projectId: string;
  date: string;
  activities: string;
  incidents: string;
  weather?: string;
  photos?: string[]; // Array of Base64 strings
  usedMaterials?: { materialId: number; name: string; quantity: number; unit: string; }[];
}

export interface Attendance {
  id?: number;
  projectId: string;
  dailyLogId?: number; // Link to the daily log
  workerId: number;
  workerName: string; // Snapshot of name
  workerRole: string; // Snapshot of role
  date: string;
  status: 'Presente' | 'Falta' | 'Tardanza' | 'Permiso' | 'Baja' | 'Descanso';
  notes?: string;
}

export interface InventoryMovement {
  id?: number;
  projectId: string;
  inventoryId?: number;
  itemName: string;
  type: 'Ingreso' | 'Salida' | 'Ajuste';
  quantity: number;
  unit: string;
  date: string;
  reference?: string; // Proveedor o Receptor
  notes?: string;
  user?: string;
}

export interface AuditLog {
  id?: number;
  tableName: string;
  recordId: string | number;
  action: 'create' | 'update' | 'delete';
  userId: number;
  username: string;
  timestamp: string;
  details?: string;
}

// Database Class
export class ObrasDB extends Dexie {
  projects!: Table<Project>;
  inventory!: Table<InventoryItem>;
  inventoryMovements!: Table<InventoryMovement>;
  transactions!: Table<Transaction>;
  suppliers!: Table<Supplier>;
  returns!: Table<Return>;
  categories!: Table<Category>;
  loans!: Table<Loan>;
  workers!: Table<Worker>;
  payrolls!: Table<Payroll>;
  users!: Table<User>;
  roles!: Table<UserRole>;
  settings!: Table<Setting>;
  workerRoles!: Table<WorkerRole>;
  clients!: Table<Client>;
  dailyLogs!: Table<DailyLog>;
  attendance!: Table<Attendance>;
  auditLogs!: Table<AuditLog>;

  constructor() {
    super('ObrasDB');
    
    // Add Audit Middleware
    this.use({
      stack: 'dbcore',
      name: 'AuditMiddleware',
      create: (downlevelDatabase) => {
        return {
          ...downlevelDatabase,
          table: (tableName) => {
            const downlevelTable = downlevelDatabase.table(tableName);
            
            // Skip auditing for auditLogs table to prevent infinite loops
            if (tableName === 'auditLogs') return downlevelTable;

            return {
              ...downlevelTable,
              mutate: async (req) => {
                // Perform the mutation
                const result = await downlevelTable.mutate(req);

                try {
                  // Get current user from localStorage
                  const userStr = localStorage.getItem('user');
                  if (!userStr) return result;
                  
                  const user = JSON.parse(userStr);
                  const timestamp = new Date().toISOString();
                  const auditEntries: AuditLog[] = [];

                  if (req.type === 'add' || req.type === 'put') {
                    const values = req.values as any[];
                    // For add/put, we might not have the ID if it's auto-incremented and not yet assigned in the object
                    // But usually Dexie returns the keys in result.
                    // If result.results is available, it contains the keys.
                    
                    // We can map values to audit entries
                    values.forEach((val, i) => {
                      let recordId = val.id;
                      // If ID was generated, we might need to look at result
                      if (!recordId && result.results) {
                        recordId = result.results[i];
                      }

                      auditEntries.push({
                        tableName,
                        recordId: recordId || 'unknown',
                        action: req.type === 'add' ? 'create' : 'update',
                        userId: user.id,
                        username: user.username,
                        timestamp,
                        details: JSON.stringify(val)
                      });
                    });
                  } else if (req.type === 'delete') {
                    const keys = req.keys as any[];
                    keys.forEach(key => {
                      auditEntries.push({
                        tableName,
                        recordId: key,
                        action: 'delete',
                        userId: user.id,
                        username: user.username,
                        timestamp,
                        details: `Deleted record with ID: ${key}`
                      });
                    });
                  } else if (req.type === 'deleteRange') {
                     // Handle deleteRange if needed, though often less common in simple apps
                     auditEntries.push({
                        tableName,
                        recordId: 'range',
                        action: 'delete',
                        userId: user.id,
                        username: user.username,
                        timestamp,
                        details: `Deleted range: ${JSON.stringify(req.range)}`
                      });
                  }

                  if (auditEntries.length > 0) {
                    // Check if auditLogs table exists (to avoid errors during upgrades or if table missing)
                    const auditTableSchema = downlevelDatabase.schema.tables.find(t => t.name === 'auditLogs');
                    
                    if (auditTableSchema) {
                        const auditTable = downlevelDatabase.table('auditLogs');
                        await auditTable.mutate({
                        type: 'add',
                        trans: req.trans,
                        values: auditEntries
                        });
                    }
                  }
                } catch (error) {
                  console.error('Audit logging failed:', error);
                }

                return result;
              }
            };
          }
        };
      }
    });

    this.version(4).stores({
      projects: '++id, name, client, status',
      inventory: '++id, projectId, name, category, status',
      transactions: '++id, projectId, type, date',
      suppliers: '++id, name',
      returns: '++id, projectId, status, dateOut',
      categories: '++id, name, type',
      loans: '++id, entity, status, type',
      workers: '++id, name, role, status',
      payrolls: '++id, projectId, status, startDate',
      users: '++id, username, role, status',
      roles: '++id, name, status',
      settings: '++id, key'
    });

    this.version(5).stores({}).upgrade(tx => {
      // @ts-ignore
      tx.table('roles').toCollection().modify(role => {
        if (role.permissions) {
          const newPerms = new Set<string>();
          role.permissions.forEach((p: string) => {
            if (p === 'read') return; // Remove generic read
            
            const resources = ['projects', 'inventory', 'transactions', 'users', 'payrolls', 'loans', 'settings', 'reports', 'suppliers', 'categories'];
            
            if (resources.includes(p)) {
              newPerms.add(`${p}.view`);
              newPerms.add(`${p}.create`);
              newPerms.add(`${p}.edit`);
              newPerms.add(`${p}.delete`);
            } else {
              newPerms.add(p);
            }
          });
          role.permissions = Array.from(newPerms);
        }
      });
    });

    this.version(6).stores({}).upgrade(async tx => {
      // Add EPPS category if not exists
      const existing = await tx.table('categories').where('name').equals('EPPS').first();
      if (!existing) {
        await tx.table('categories').add({ name: 'EPPS', type: 'expense', classification: 'Seguridad' });
      }
    });

    this.version(7).stores({}).upgrade(async tx => {
      // Update Income Categories to match "Sub Category" structure
      const updates = [
        { oldName: 'Valorizacion', newName: 'Valorización' },
        { oldName: 'Liquidacion', newName: 'Liquidación' },
        { oldName: 'Otros Ingresos', newName: 'Otros ingresos' },
        { oldName: 'Adelanto', newName: 'Adelanto' } // Just to ensure classification update
      ];

      for (const update of updates) {
        // Update Category Definition
        // We use modify to update name and set classification to match name (as subcategory)
        await tx.table('categories').where('name').equals(update.oldName).modify({ 
          name: update.newName, 
          classification: update.newName 
        });
      }

      // Update Transactions using this category
      // Note: 'category' is not indexed in transactions table in version 4, so we iterate collection
      await tx.table('transactions').toCollection().modify(t => {
        if (t.category === 'Valorizacion') t.category = 'Valorización';
        else if (t.category === 'Liquidacion') t.category = 'Liquidación';
        else if (t.category === 'Otros Ingresos') t.category = 'Otros ingresos';
      });

      // Ensure all required income categories exist
      const requiredIncomes = ['Valorización', 'Adelanto', 'Liquidación', 'Otros ingresos'];
      for (const inc of requiredIncomes) {
        const exists = await tx.table('categories').where('name').equals(inc).first();
        if (!exists) {
           await tx.table('categories').add({ name: inc, type: 'income', classification: inc });
        }
      }
    });

    this.version(8).stores({}).upgrade(async tx => {
      // 1. Move Warehouse Items to type 'warehouse' and classification 'Almacen'
      const warehouseItems = ['Materiales', 'Herramientas', 'Equipos', 'EPPS'];
      
      for (const item of warehouseItems) {
        const exists = await tx.table('categories').where('name').equals(item).first();
        if (exists) {
          await tx.table('categories').where('name').equals(item).modify({
            type: 'warehouse',
            classification: 'Almacen'
          });
        } else {
          await tx.table('categories').add({
            name: item,
            type: 'warehouse',
            classification: 'Almacen'
          });
        }
      }

      // 2. Update Income categories classification
      await tx.table('categories').where('type').equals('income').modify({ 
        classification: 'Ingreso' 
      });

      // 3. Update remaining Expense categories classification
      // Note: warehouse items have already been moved to type 'warehouse', so this won't affect them
      await tx.table('categories').where('type').equals('expense').modify({ 
        classification: 'Gasto' 
      });
    });

    this.version(9).stores({
      settings: '++id, key'
    });

    this.version(10).stores({
      workers: '++id, name, role, status, projectId'
    });

    this.version(11).stores({
      workerRoles: '++id, name'
    });

    this.version(12).stores({}).upgrade(async tx => {
      const roles = await tx.table('workerRoles').toArray();
      const uniqueNames = new Set<string>();
      const idsToDelete: number[] = [];

      for (const role of roles) {
        const normalizedName = role.name.trim().toLowerCase();
        if (uniqueNames.has(normalizedName)) {
          idsToDelete.push(role.id!);
        } else {
          uniqueNames.add(normalizedName);
        }
      }

      if (idsToDelete.length > 0) {
        await tx.table('workerRoles').bulkDelete(idsToDelete);
      }
    });

    this.version(13).stores({
      clients: '++id, name, type'
    }).upgrade(async tx => {
      // Migrate unique clients from projects to clients table
      const projects = await tx.table('projects').toArray();
      const uniqueClients = new Map<string, any>();
      
      projects.forEach(p => {
        if (!uniqueClients.has(p.client)) {
          uniqueClients.set(p.client, {
            name: p.client,
            email: p.clientEmail || '',
            phone: p.clientPhone || '',
            type: p.clientType || 'Empresa', // Default to Empresa if unknown
            address: ''
          });
        }
      });
      
      const clientsToAdd = Array.from(uniqueClients.values());
      if (clientsToAdd.length > 0) {
        await tx.table('clients').bulkAdd(clientsToAdd);
      }
    });

    this.version(14).stores({
      dailyLogs: '++id, projectId, date',
      attendance: '++id, projectId, date, workerId, dailyLogId'
    });

    this.version(15).stores({}).upgrade(async tx => {
      // Add permissions to Supervisor role for new panels
      const supervisor = await tx.table('roles').where('name').equals('Supervisor').first();
      if (supervisor) {
        const newPermissions = [
            'dailyLogs.view', 'dailyLogs.create', 'dailyLogs.edit', 'dailyLogs.delete',
            'attendance.view', 'attendance.create', 'attendance.edit',
            'workers.delete' // Add delete permission if missing
        ];
        
        const currentPermissions = new Set(supervisor.permissions);
        newPermissions.forEach(p => currentPermissions.add(p));
        
        await tx.table('roles').update(supervisor.id, {
            permissions: Array.from(currentPermissions)
        });
      }
    });

    this.version(16).stores({
      inventoryMovements: '++id, projectId, inventoryId, type, date, itemName'
    });

    this.version(17).stores({
      auditLogs: '++id, tableName, action, userId, timestamp'
    }).upgrade(async tx => {
      // Force password change for admin user
      const admin = await tx.table('users').where('username').equals('admin').first();
      if (admin) {
        await tx.table('users').update(admin.id, { forcePasswordChange: true });
      }
    });

    this.version(18).stores({}).upgrade(async tx => {
      // Add new roles: Administrador General and Administrador de Obra
      const rolesTable = tx.table('roles');
      
      // Administrador General
      const adminGen = await rolesTable.where('name').equals('Administrador General').first();
      if (!adminGen) {
        await rolesTable.add({
          name: 'Administrador General',
          description: 'Acceso Total al sistema (Nivel Gerencial)',
          status: 'Activo',
          permissions: ['all']
        });
      }

      // Administrador de Obra
      const adminObra = await rolesTable.where('name').equals('Administrador de Obra').first();
      if (!adminObra) {
        const permissions = [
          'projects.view', 'projects.create', 'projects.edit', 'projects.delete',
          'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete',
          'transactions.view', 'transactions.create', 'transactions.edit', 'transactions.delete',
          'workers.view', 'workers.create', 'workers.edit', 'workers.delete',
          'payrolls.view', 'payrolls.create', 'payrolls.edit', 'payrolls.delete',
          'loans.view', 'loans.create', 'loans.edit', 'loans.delete',
          'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
          'reports',
          'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.delete',
          'dailyLogs.view', 'dailyLogs.create', 'dailyLogs.edit', 'dailyLogs.delete',
          'attendance.view', 'attendance.create', 'attendance.edit', 'attendance.delete',
          'categories.view', 'categories.create', 'categories.edit', 'categories.delete',
          'users.view'
        ];
        
        await rolesTable.add({
          name: 'Administrador de Obra',
          description: 'Gestión completa de obras y recursos',
          status: 'Activo',
          permissions: permissions
        });
      }
    });

    // Populate data for fresh installs
    this.on('populate', async (tx) => {
      // 1. Create Default Admin User
      await tx.table('users').add({
        name: 'Administrador',
        username: 'admin',
        password: '123456', // Default password
        role: 'Administrador General',
        status: 'Activo',
        email: 'admin@obras.com',
        forcePasswordChange: true
      });

      // 2. Create Default Roles
      await tx.table('roles').bulkAdd([
        {
          name: 'Administrador General',
          description: 'Acceso Total al sistema (Nivel Gerencial)',
          status: 'Activo',
          permissions: ['all']
        },
        {
          name: 'Administrador de Obra',
          description: 'Gestión completa de obras y recursos',
          status: 'Activo',
          permissions: [
            'projects.view', 'projects.create', 'projects.edit', 'projects.delete',
            'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete',
            'transactions.view', 'transactions.create', 'transactions.edit', 'transactions.delete',
            'workers.view', 'workers.create', 'workers.edit', 'workers.delete',
            'payrolls.view', 'payrolls.create', 'payrolls.edit', 'payrolls.delete',
            'loans.view', 'loans.create', 'loans.edit', 'loans.delete',
            'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
            'reports',
            'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.delete',
            'dailyLogs.view', 'dailyLogs.create', 'dailyLogs.edit', 'dailyLogs.delete',
            'attendance.view', 'attendance.create', 'attendance.edit', 'attendance.delete',
            'categories.view', 'categories.create', 'categories.edit', 'categories.delete',
            'users.view'
          ]
        },
        {
          name: 'Supervisor',
          description: 'Supervisión de campo y reportes diarios',
          status: 'Activo',
          permissions: [
            'projects.view', 'inventory.view', 'inventory.create', 'inventory.edit',
            'dailyLogs.view', 'dailyLogs.create', 'dailyLogs.edit',
            'attendance.view', 'attendance.create', 'attendance.edit',
            'workers.view'
          ]
        },
        {
          name: 'Almacenero',
          description: 'Control de inventario y materiales',
          status: 'Activo',
          permissions: [
            'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete',
            'suppliers.view', 'suppliers.create', 'suppliers.edit'
          ]
        }
      ]);

      // 3. Create Default Categories
      await tx.table('categories').bulkAdd([
        { name: 'Materiales', type: 'warehouse', classification: 'Almacen' },
        { name: 'Herramientas', type: 'warehouse', classification: 'Almacen' },
        { name: 'Equipos', type: 'warehouse', classification: 'Almacen' },
        { name: 'EPPS', type: 'warehouse', classification: 'Almacen' },
        { name: 'Valorización', type: 'income', classification: 'Ingreso' },
        { name: 'Adelanto', type: 'income', classification: 'Ingreso' },
        { name: 'Liquidación', type: 'income', classification: 'Ingreso' },
        { name: 'Otros ingresos', type: 'income', classification: 'Ingreso' },
        { name: 'Mano de Obra', type: 'expense', classification: 'Gasto' },
        { name: 'Materiales (Gasto)', type: 'expense', classification: 'Gasto' },
        { name: 'Subcontratos', type: 'expense', classification: 'Gasto' },
        { name: 'Equipos (Alquiler)', type: 'expense', classification: 'Gasto' },
        { name: 'Gastos Generales', type: 'expense', classification: 'Gasto' }
      ]);
      
      // 4. Create Default Worker Roles
      await tx.table('workerRoles').bulkAdd([
        { name: 'Peón' },
        { name: 'Oficial' },
        { name: 'Operario' },
        { name: 'Capataz' },
        { name: 'Maestro de Obra' },
        { name: 'Topógrafo' },
        { name: 'Vigilante' },
        { name: 'Almacenero' }
      ]);
    });
  }
}

export const db = new ObrasDB();

export const migrateData = async () => {
  // Migrate Projects: Convert value and balance to numbers if they are strings
  const projects = await db.projects.toArray();
  for (const project of projects) {
    let needsUpdate = false;
    let newValue = project.value;
    let newBalance = project.balance;

    if (typeof project.value === 'string') {
      // @ts-ignore
      newValue = parseFloat(project.value.replace(/[^0-9.-]+/g, '')) || 0;
      needsUpdate = true;
    }

    if (typeof project.balance === 'string') {
      // @ts-ignore
      newBalance = parseFloat(project.balance.replace(/[^0-9.-]+/g, '')) || 0;
      // Handle negative sign in string if needed, but regex handles minus
      // Check if it was something like "- S/ 20,000" -> -20000
      // The regex [^0-9.-]+ might leave multiple dashes if not careful, but usually fine for "S/ -20" or "- S/ 20"
      // Let's be more specific
      // @ts-ignore
      const strBalance = project.balance as string;
      const isNegative = strBalance.includes('-');
      const num = parseFloat(strBalance.replace(/[^0-9.]+/g, '')) || 0;
      newBalance = isNegative ? -num : num;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await db.projects.update(project.id!, { value: newValue, balance: newBalance });
    }
  }
};

// Seed function to populate data if empty
export const seedDatabase = async () => {
  await migrateData();

  /* 
  const projectCount = await db.projects.count();
  if (projectCount === 0) {
    await db.projects.bulkAdd([
      { name: 'Residencial Los Olivos', client: 'Inmobiliaria Norte', value: 1200000, balance: 150000, status: 'En Ejecución' },
      { name: 'Edificio Multifamiliar', client: 'Grupo Constructor', value: 850000, balance: -20000, status: 'En Planificación' },
      { name: 'Remodelación Oficinas', client: 'Tech Solutions', value: 45000, balance: 12000, status: 'Finalizado' }
    ]);
  }

  const inventoryCount = await db.inventory.count();
  if (inventoryCount === 0) {
    await db.inventory.bulkAdd([
      { projectId: '1', name: 'Cemento Sol Tipo I', category: 'Materiales', quantity: 150, unit: 'bolsas', status: 'In Stock', date: '2025-01-15' },
      { projectId: '1', name: 'Fierro 1/2"', category: 'Materiales', quantity: 500, unit: 'varillas', status: 'In Stock', date: '2025-01-10' },
      { projectId: '2', name: 'Arena Gruesa', category: 'Agregados', quantity: 20, unit: 'm3', status: 'Low Stock', date: '2025-01-20' },
      { projectId: '2', name: 'Ladrillo King Kong', category: 'Materiales', quantity: 2000, unit: 'unidades', status: 'In Stock', date: '2025-01-05' },
      { projectId: '1', name: 'Pintura Blanca', category: 'Acabados', quantity: 30, unit: 'baldes', status: 'In Stock', date: '2025-01-18' }
    ]);
  }

  const returnsCount = await db.returns.count();
  if (returnsCount === 0) {
    await db.returns.bulkAdd([
      { projectId: '1', name: 'Taladro Percutor', receiver: 'Juan Pérez', dateOut: '2025-01-20', quantity: 1, unit: 'unidad', status: 'Pending' },
      { projectId: '1', name: 'Amoladora Angular', receiver: 'Carlos Ruiz', dateOut: '2025-01-21', quantity: 1, unit: 'unidad', status: 'Pending' },
      { projectId: '2', name: 'Andamio Metálico', receiver: 'Empresa Constructora SAC', dateOut: '2025-01-15', quantity: 10, unit: 'cuerpos', status: 'Pending' }
    ]);
  }
  */

  const usersCount = await db.users.count();
  if (usersCount === 0) {
    await db.users.bulkAdd([
      { name: 'Administrador', username: 'admin', role: 'Administrador General', email: 'admin@obras.com', status: 'Activo', password: '123456', forcePasswordChange: true },
      { name: 'Juan Perez', username: 'jperez', role: 'Supervisor', email: 'juan@obras.com', status: 'Activo', password: '123' },
      { name: 'Maria Garcia', username: 'mgarcia', role: 'Contador', email: 'maria@obras.com', status: 'Inactivo', password: '123' }
    ]);
  }

  const rolesCount = await db.roles.count();
  if (rolesCount === 0) {
    await db.roles.bulkAdd([
      { name: 'Administrador General', description: 'Acceso Total al sistema (Nivel Gerencial)', status: 'Activo', permissions: ['all'] },
      { name: 'Administrador de Obra', description: 'Gestión completa de obras y recursos', status: 'Activo', permissions: ['projects.view', 'projects.create', 'projects.edit', 'projects.delete', 'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete', 'transactions.view', 'transactions.create', 'transactions.edit', 'transactions.delete', 'workers.view', 'workers.create', 'workers.edit', 'workers.delete', 'payrolls.view', 'payrolls.create', 'payrolls.edit', 'payrolls.delete', 'loans.view', 'loans.create', 'loans.edit', 'loans.delete', 'clients.view', 'clients.create', 'clients.edit', 'clients.delete', 'reports', 'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.delete', 'dailyLogs.view', 'dailyLogs.create', 'dailyLogs.edit', 'dailyLogs.delete', 'attendance.view', 'attendance.create', 'attendance.edit', 'attendance.delete', 'categories.view', 'categories.create', 'categories.edit', 'categories.delete', 'users.view'] },
      { 
        name: 'Supervisor', 
        description: 'Gestión de Obras y Personal', 
        status: 'Activo', 
        permissions: ['projects.view', 'projects.edit', 'workers.view', 'workers.create', 'workers.edit', 'inventory.view', 'inventory.create', 'inventory.edit'] 
      }
    ]);
  }

  const workerRolesCount = await db.workerRoles.count();
  if (workerRolesCount === 0) {
    await db.workerRoles.bulkAdd([
      { name: 'Peon' },
      { name: 'Oficial' },
      { name: 'Operario' },
      { name: 'Maestro de Obra' },
      { name: 'Capataz' },
      { name: 'Topógrafo' }
    ]);
  }

  const categoriesCount = await db.categories.count();
  if (categoriesCount === 0) {
    await db.categories.bulkAdd([
      // Income Categories
      { name: 'Valorización', type: 'income', classification: 'Ingreso' },
      { name: 'Adelanto', type: 'income', classification: 'Ingreso' },
      { name: 'Liquidación', type: 'income', classification: 'Ingreso' },
      { name: 'Otros ingresos', type: 'income', classification: 'Ingreso' },
      
      // Expense Categories
      { name: 'Pago de planilla', type: 'expense', classification: 'Gasto' },
      { name: 'Pago de materiales', type: 'expense', classification: 'Gasto' },
      { name: 'Penalidades', type: 'expense', classification: 'Gasto' },
      { name: 'Alquileres', type: 'expense', classification: 'Gasto' },
      { name: 'Otros Gastos', type: 'expense', classification: 'Gasto' },
      { name: 'Materiales', type: 'expense', classification: 'Gasto' },
      { name: 'Agregados', type: 'expense', classification: 'Gasto' },
      { name: 'Acabados', type: 'expense', classification: 'Gasto' },
      { name: 'Herramientas', type: 'expense', classification: 'Gasto' },
      { name: 'Equipos', type: 'expense', classification: 'Gasto' },
      { name: 'EPPS', type: 'expense', classification: 'Gasto' }
    ]);
  }

  /*
  const loansCount = await db.loans.count();
  if (loansCount === 0) {
    await db.loans.bulkAdd([
      { entity: 'Banco BCP', type: 'Prestamo Recibido', amount: 50000, date: '2025-01-01', dueDate: '2025-06-01', status: 'Pendiente', description: 'Capital de trabajo' },
      { entity: 'Juan Obrero', type: 'Prestamo Otorgado', amount: 500, date: '2025-01-15', status: 'Pendiente', description: 'Adelanto de sueldo' }
    ]);
  }

  const workersCount = await db.workers.count();
  if (workersCount === 0) {
    await db.workers.bulkAdd([
      { name: 'Pedro Picapiedra', role: 'Operario', dailyRate: 120, status: 'Activo' },
      { name: 'Pablo Marmol', role: 'Oficial', dailyRate: 100, status: 'Activo' },
      { name: 'Bob Constructor', role: 'Maestro de Obra', dailyRate: 150, status: 'Activo' }
    ]);
  }

  const payrollsCount = await db.payrolls.count();
  if (payrollsCount === 0) {
    await db.payrolls.bulkAdd([
      {
        projectId: '1',
        startDate: '2025-01-01',
        endDate: '2025-01-07',
        totalAmount: 1500,
        status: 'Pagado',
        details: [
          { workerId: 1, workerName: 'Pedro Picapiedra', role: 'Operario', daysWorked: 6, amount: 720 },
          { workerId: 2, workerName: 'Pablo Marmol', role: 'Oficial', daysWorked: 6, amount: 600 }
        ]
      }
    ]);
  }
  */
};
