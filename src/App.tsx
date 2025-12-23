import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { seedDatabase } from './db/db';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectRegister from './pages/ProjectRegister';
import Analysis from './pages/Analysis';
import Transactions from './pages/Transactions';
import Categories from './pages/Categories';
import CategoryRegister from './pages/CategoryRegister';
import Warehouse from './pages/Warehouse';
import WarehouseRegister from './pages/WarehouseRegister';
import WarehouseOutput from './pages/WarehouseOutput';
import WarehouseReturns from './pages/WarehouseReturns';
import Suppliers from './pages/Suppliers';
import SupplierRegister from './pages/SupplierRegister';
import Reports from './pages/Reports';
import Clients from './pages/Clients';
import Users from './pages/Users';
import UserRegister from './pages/UserRegister';
import Loans from './pages/Loans';
import LoanRegister from './pages/LoanRegister';
import Payrolls from './pages/Payrolls';
import PayrollRegister from './pages/PayrollRegister';
import Settings from './pages/Settings';

function App() {
  useEffect(() => {
    seedDatabase();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/finished" element={<Projects filterStatus="Finalizado" />} />
          <Route path="projects/new" element={<ProjectRegister />} />
          <Route path="projects/edit/:id" element={<ProjectRegister />} />
          <Route path="analysis" element={<Analysis />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="categories" element={<Categories />} />
          <Route path="categories/new" element={<CategoryRegister />} />
          <Route path="categories/edit/:id" element={<CategoryRegister />} />
          <Route path="loans" element={<Loans />} />
          <Route path="loans/new" element={<LoanRegister />} />
          <Route path="loans/edit/:id" element={<LoanRegister />} />
          <Route path="payrolls" element={<Payrolls />} />
          <Route path="payrolls/new" element={<PayrollRegister />} />
          <Route path="payrolls/edit/:id" element={<PayrollRegister />} />
          <Route path="warehouse" element={<Warehouse />} />
          <Route path="warehouse/new" element={<WarehouseRegister />} />
          <Route path="warehouse/edit/:id" element={<WarehouseRegister />} />
          <Route path="warehouse/output" element={<WarehouseOutput />} />
          <Route path="warehouse/returns" element={<WarehouseReturns />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="suppliers/new" element={<SupplierRegister />} />
          <Route path="reports" element={<Reports />} />
          <Route path="clients" element={<Clients />} />
          <Route path="users" element={<Users />} />
          <Route path="users/new" element={<UserRegister />} />
          <Route path="users/edit/:id" element={<UserRegister />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
