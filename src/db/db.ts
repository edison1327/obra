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
}

export interface Transaction {
  id?: number;
  projectId: string;
  type: 'Ingreso' | 'Gasto';
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
  type: 'income' | 'expense';
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
}

export interface Worker {
  id?: number;
  name: string;
  role: string; // e.g., Peon, Oficial, Operario
  documentNumber?: string;
  dailyRate?: number;
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
}

// Database Class
export class ObrasDB extends Dexie {
  projects!: Table<Project>;
  inventory!: Table<InventoryItem>;
  transactions!: Table<Transaction>;
  suppliers!: Table<Supplier>;
  returns!: Table<Return>;
  categories!: Table<Category>;
  loans!: Table<Loan>;
  workers!: Table<Worker>;
  payrolls!: Table<Payroll>;
  users!: Table<User>;

  constructor() {
    super('ObrasDB');
    
    this.version(3).stores({
      projects: '++id, name, client, status',
      inventory: '++id, projectId, name, category, status',
      transactions: '++id, projectId, type, date',
      suppliers: '++id, name',
      returns: '++id, projectId, status, dateOut',
      categories: '++id, name, type',
      loans: '++id, entity, status, type',
      workers: '++id, name, role, status',
      payrolls: '++id, projectId, status, startDate',
      users: '++id, username, role, status'
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

  const usersCount = await db.users.count();
  if (usersCount === 0) {
    await db.users.bulkAdd([
      { name: 'Admin Principal', username: 'admin', role: 'Administrador', email: 'admin@obras.com', status: 'Activo', password: 'admin' },
      { name: 'Juan Perez', username: 'jperez', role: 'Supervisor', email: 'juan@obras.com', status: 'Activo', password: '123' },
      { name: 'Maria Garcia', username: 'mgarcia', role: 'Contador', email: 'maria@obras.com', status: 'Inactivo', password: '123' }
    ]);
  }

  const categoriesCount = await db.categories.count();
  if (categoriesCount === 0) {
    await db.categories.bulkAdd([
      // Income Categories
      { name: 'Valorizacion', type: 'income', classification: 'Ingreso Operativo' },
      { name: 'Adelanto', type: 'income', classification: 'Ingreso Financiero' },
      { name: 'Liquidacion', type: 'income', classification: 'Ingreso Final' },
      { name: 'Otros Ingresos', type: 'income', classification: 'Otros' },
      
      // Expense Categories
      { name: 'Pago de planilla', type: 'expense', classification: 'Mano de Obra' },
      { name: 'Pago de materiales', type: 'expense', classification: 'Materiales' },
      { name: 'Penalidades', type: 'expense', classification: 'Administrativo' },
      { name: 'Alquileres', type: 'expense', classification: 'Equipos' },
      { name: 'Otros Gastos', type: 'expense', classification: 'Otros' },
      { name: 'Materiales', type: 'expense', classification: 'Materiales' },
      { name: 'Agregados', type: 'expense', classification: 'Materiales' },
      { name: 'Acabados', type: 'expense', classification: 'Materiales' },
      { name: 'Herramientas', type: 'expense', classification: 'Equipos' },
      { name: 'Equipos', type: 'expense', classification: 'Equipos' }
    ]);
  }

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
};
