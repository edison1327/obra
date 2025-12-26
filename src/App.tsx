import { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { seedDatabase } from './db/db';
import { SyncService } from './services/SyncService';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectRegister from './pages/ProjectRegister';
import DailyLogs from './pages/DailyLogs';
import DailyLogRegister from './pages/DailyLogRegister';
import Analysis from './pages/Analysis';
import Transactions from './pages/Transactions';
import Categories from './pages/Categories';
import CategoryRegister from './pages/CategoryRegister';
import Warehouse from './pages/Warehouse';
import WarehouseRegister from './pages/WarehouseRegister';
import WarehouseOutput from './pages/WarehouseOutput';
import WarehouseReturns from './pages/WarehouseReturns';
import WarehouseReports from './pages/WarehouseReports';
import Suppliers from './pages/Suppliers';
import SupplierRegister from './pages/SupplierRegister';
import Reports from './pages/Reports';
import Clients from './pages/Clients';
import Users from './pages/Users';
import UserRegister from './pages/UserRegister';
import UserRoles from './pages/UserRoles';
import UserRoleRegister from './pages/UserRoleRegister';
import Loans from './pages/Loans';
import LoanRegister from './pages/LoanRegister';
import Payrolls from './pages/Payrolls';
import PayrollRegister from './pages/PayrollRegister';
import Workers from './pages/Workers';
import Attendance from './pages/Attendance';
import Settings from './pages/Settings';
import ReloadPrompt from './components/ReloadPrompt';
import OfflineIndicator from './components/OfflineIndicator';

function App() {
  useEffect(() => {
    seedDatabase();
    // Start auto-sync every 30 seconds
    SyncService.startAutoSync(30000);

    return () => {
      SyncService.stopAutoSync();
    };
  }, []);

  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <ReloadPrompt />
      <OfflineIndicator />
      <Router>
        <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<Layout />}>
            <Route element={<ProtectedRoute permission="view_dashboard" redirectPath="/projects" />}>
              <Route index element={<Dashboard />} />
            </Route>
            
            <Route element={<ProtectedRoute permission="projects.view" />}>
              <Route path="projects" element={<Projects />} />
              <Route path="projects/finished" element={<Projects filterStatus="Finalizado" />} />
              <Route path="clients" element={<Clients />} />
            </Route>
            <Route element={<ProtectedRoute permission="projects.create" />}>
              <Route path="projects/new" element={<ProjectRegister />} />
            </Route>
            <Route element={<ProtectedRoute permission="projects.edit" />}>
              <Route path="projects/edit/:id" element={<ProjectRegister />} />
            </Route>
            
            <Route element={<ProtectedRoute permission="dailyLogs.view" />}>
              <Route path="daily-logs" element={<DailyLogs />} />
            </Route>
            <Route element={<ProtectedRoute permission="dailyLogs.create" />}>
              <Route path="daily-logs/new" element={<DailyLogRegister />} />
            </Route>

            <Route element={<ProtectedRoute permission="reports.view" />}>
              <Route path="analysis" element={<Analysis />} />
              <Route path="reports" element={<Reports />} />
            </Route>

            <Route element={<ProtectedRoute permission="transactions.view" />}>
              <Route path="transactions" element={<Transactions />} />
            </Route>

            <Route element={<ProtectedRoute permission="categories.view" />}>
              <Route path="categories" element={<Categories />} />
            </Route>
            <Route element={<ProtectedRoute permission="categories.create" />}>
              <Route path="categories/new" element={<CategoryRegister />} />
            </Route>
            <Route element={<ProtectedRoute permission="categories.edit" />}>
              <Route path="categories/edit/:id" element={<CategoryRegister />} />
            </Route>

            <Route element={<ProtectedRoute permission="settings.view" />}>
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route element={<ProtectedRoute permission="loans.view" />}>
              <Route path="loans" element={<Loans />} />
            </Route>
            <Route element={<ProtectedRoute permission="loans.create" />}>
              <Route path="loans/new" element={<LoanRegister />} />
            </Route>
            <Route element={<ProtectedRoute permission="loans.edit" />}>
              <Route path="loans/edit/:id" element={<LoanRegister />} />
            </Route>

            <Route element={<ProtectedRoute permission="payrolls.view" />}>
              <Route path="payrolls" element={<Payrolls />} />
            </Route>
            <Route element={<ProtectedRoute permission="payrolls.create" />}>
              <Route path="payrolls/new" element={<PayrollRegister />} />
            </Route>
            <Route element={<ProtectedRoute permission="payrolls.edit" />}>
              <Route path="payrolls/edit/:id" element={<PayrollRegister />} />
            </Route>

            <Route element={<ProtectedRoute permission="workers.view" />}>
              <Route path="workers" element={<Workers />} />
            </Route>

            <Route element={<ProtectedRoute permission="attendance.view" />}>
              <Route path="attendance" element={<Attendance />} />
            </Route>

            <Route element={<ProtectedRoute permission="inventory.view" />}>
              <Route path="warehouse" element={<Warehouse />} />
              <Route path="warehouse/returns" element={<WarehouseReturns />} />
              <Route path="warehouse/reports" element={<WarehouseReports />} />
            </Route>
            <Route element={<ProtectedRoute permission="inventory.create" />}>
              <Route path="warehouse/new" element={<WarehouseRegister />} />
              <Route path="warehouse/output" element={<WarehouseOutput />} />
            </Route>
            <Route element={<ProtectedRoute permission="inventory.edit" />}>
              <Route path="warehouse/edit/:id" element={<WarehouseRegister />} />
            </Route>

            <Route element={<ProtectedRoute permission="suppliers.view" />}>
              <Route path="suppliers" element={<Suppliers />} />
            </Route>
            <Route element={<ProtectedRoute permission="suppliers.create" />}>
              <Route path="suppliers/new" element={<SupplierRegister />} />
            </Route>
            <Route element={<ProtectedRoute permission="suppliers.edit" />}>
              <Route path="suppliers/edit/:id" element={<SupplierRegister />} />
            </Route>

            <Route element={<ProtectedRoute permission="users.view" />}>
              <Route path="users" element={<Users />} />
              <Route path="user-roles" element={<UserRoles />} />
            </Route>
            <Route element={<ProtectedRoute permission="users.create" />}>
              <Route path="users/new" element={<UserRegister />} />
              <Route path="user-roles/new" element={<UserRoleRegister />} />
            </Route>
            <Route element={<ProtectedRoute permission="users.edit" />}>
              <Route path="users/edit/:id" element={<UserRegister />} />
              <Route path="user-roles/edit/:id" element={<UserRoleRegister />} />
            </Route>
          </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
    </AuthProvider>
  );
}

export default App;
