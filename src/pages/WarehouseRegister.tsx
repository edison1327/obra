import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, Plus } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import toast from 'react-hot-toast';
import SearchableSelect from '../components/SearchableSelect';
import SupplierModal from '../components/SupplierModal';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { SyncService } from '../services/SyncService';

const WarehouseRegister = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === 'dark';

  const navigate = useNavigate();
  const { id } = useParams();

  // Theme variables
  const textColor = isDark ? 'text-white' : 'text-gray-800';
  const subTextColor = isDark ? 'text-gray-300' : 'text-gray-700';
  const labelColor = isDark ? 'text-gray-300' : 'text-gray-700';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
  const inputText = isDark ? 'text-white' : 'text-gray-900';
  
  // Fetch projects for dropdown
  const projects = useLiveQuery(async () => {
    if (user?.projectId) {
      const userProject = await db.projects.get(Number(user.projectId));
      return userProject ? [userProject] : [];
    }
    return db.projects.toArray();
  }, [user?.projectId]) || [];

  // Fetch categories
  const categoriesList = useLiveQuery(async () => {
    // Fetch all categories of type 'warehouse' (Materiales, Herramientas, Equipos, EPPS)
    return db.categories.where('type').equals('warehouse').toArray();
  }) || [];

  const categoryOptions = categoriesList.map(c => ({ value: c.name, label: c.name }));

  const unitOptions = [
    { value: "Unidad", label: "Unidad" },
    { value: "Global", label: "Global" },
    { value: "m2", label: "m2" },
    { value: "ml", label: "ml" },
    { value: "kg", label: "kg" },
    { value: "m3", label: "m3" },
    { value: "bolsa", label: "bolsa" },
    { value: "galon", label: "galon" },
  ];

  // State
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [minStock, setMinStock] = useState('10');
  const [status, setStatus] = useState('In Stock');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierId, setSupplierId] = useState('');
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  // Fetch suppliers
  const suppliers = useLiveQuery(() => db.suppliers.toArray()) || [];
  const supplierOptions = suppliers.map(s => ({ value: s.id!, label: s.name }));

  const handleSupplierSuccess = (newSupplierId: number) => {
    setSupplierId(newSupplierId.toString());
    setIsSupplierModalOpen(false);
  };

  // Auto-select project if user has one assigned
  useEffect(() => {
    if (user?.projectId && !id) {
      setProjectId(user.projectId.toString());
    }
  }, [user?.projectId, id]);

  // Load data if editing
  useEffect(() => {
    const loadItem = async () => {
      if (id) {
        const item = await db.inventory.get(Number(id));
        if (item) {
          setProjectId(item.projectId);
          setName(item.name);
          setCategory(item.category);
          setQuantity(item.quantity.toString());
          setUnit(item.unit);
          if (item.minStock !== undefined) setMinStock(item.minStock.toString());
          setStatus(item.status);
          setDate(item.date);
          if (item.supplierId) setSupplierId(item.supplierId);
        }
      }
    };
    loadItem();
  }, [id]);

  const projectOptions = projects.map(p => ({ value: p.id!, label: p.name }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId) {
      toast.error('Debe seleccionar una obra');
      return;
    }

    try {
      await db.transaction('rw', db.inventory, db.inventoryMovements, async () => {
        const itemData = {
          projectId,
          name,
          category,
          quantity: Number(quantity),
          unit,
          minStock: Number(minStock),
          status,
          date,
          supplierId
        };

        if (id) {
          const prevItem = await db.inventory.get(Number(id));
          if (prevItem) {
            const diff = Number(quantity) - prevItem.quantity;
            if (diff > 0) {
               await db.inventoryMovements.add({
                  projectId,
                  inventoryId: Number(id),
                  itemName: name,
                  type: 'Ingreso',
                  quantity: diff,
                  unit,
                  date,
                  reference: supplierId ? 'Proveedor ID: ' + supplierId : 'Ajuste de Stock',
                  user: user?.username
              });
            } else if (diff < 0) {
               await db.inventoryMovements.add({
                  projectId,
                  inventoryId: Number(id),
                  itemName: name,
                  type: 'Ajuste',
                  quantity: Math.abs(diff),
                  unit,
                  date,
                  reference: 'Ajuste Manual (Disminución)',
                  user: user?.username
              });
            }
          }
          await db.inventory.update(Number(id), itemData);
        } else {
          const newId = await db.inventory.add(itemData);
          await db.inventoryMovements.add({
              projectId,
              inventoryId: Number(newId),
              itemName: name,
              type: 'Ingreso',
              quantity: Number(quantity),
              unit,
              date,
              reference: supplierId ? 'Proveedor ID: ' + supplierId : 'Ingreso Inicial',
              user: user?.username
          });
        }
      });

      await SyncService.pushToRemote(false);

      toast.success('Ingreso registrado correctamente');
      navigate('/warehouse');
    } catch (error) {
      console.error('Error saving inventory item:', error);
      toast.error('Error al registrar el ingreso');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className={`text-2xl font-bold ${textColor}`}>
          {id ? 'Editar Ingreso' : 'Registrar Ingreso de Material'}
        </h1>
        <button 
          onClick={() => navigate('/warehouse')}
          className={`${subTextColor} hover:text-gray-900 dark:hover:text-gray-100 transition-colors`}
        >
          <X size={24} />
        </button>
      </div>

      <div className={`${cardBg} rounded-lg shadow-md p-6 md:p-8`}>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Obra */}
            <div className="md:col-span-2">
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>Obra <span className="text-red-500">*</span></label>
              <SearchableSelect
                options={projectOptions}
                value={projectId}
                onChange={setProjectId}
                className="w-full"
                placeholder="Seleccione una obra..."
              />
            </div>

            {/* Nombre */}
            <div className="md:col-span-1">
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>Nombre del Artículo <span className="text-red-500">*</span></label>
              <input 
                required
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText} ${isDark ? 'placeholder-gray-400' : ''}`}
                placeholder="Ej. Cemento, Fierro, Pintura..."
              />
            </div>

            {/* Proveedor */}
            <div className="md:col-span-1">
              <div className="flex justify-between items-center mb-1">
                <label className={`block text-sm font-medium ${labelColor}`}>Proveedor</label>
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(true)}
                  className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                >
                  <Plus size={14} /> Nuevo
                </button>
              </div>
              <SearchableSelect
                options={supplierOptions}
                value={supplierId}
                onChange={setSupplierId}
                className="w-full"
                placeholder="Seleccione proveedor..."
              />
            </div>

            {/* Categoría */}
            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>Categoría <span className="text-red-500">*</span></label>
              <SearchableSelect
                required
                options={categoryOptions}
                value={category}
                onChange={setCategory}
                className="w-full"
                placeholder="Seleccione categoría..."
              />
            </div>

            {/* Cantidad y Unidad y Stock Mínimo */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={`block text-sm font-medium ${labelColor} mb-1`}>Cantidad Inicial <span className="text-red-500">*</span></label>
                <input 
                  required
                  type="number" 
                  step="0.01"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0.00"
                  className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText} ${isDark ? 'placeholder-gray-400' : ''}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${labelColor} mb-1`}>Unidad <span className="text-red-500">*</span></label>
                <SearchableSelect
                  options={unitOptions}
                  value={unit}
                  onChange={setUnit}
                  className="w-full"
                  placeholder="Seleccione..."
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${labelColor} mb-1`}>Stock Mínimo (Alerta)</label>
                <input 
                  type="number" 
                  step="1"
                  min="0"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  placeholder="10"
                  className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText} ${isDark ? 'placeholder-gray-400' : ''}`}
                />
                <p className={`text-xs ${subTextColor} mt-1`}>Notificar si baja de esta cantidad</p>
              </div>
            </div>

            {/* Fecha */}
            <div>
              <label className={`block text-sm font-medium ${labelColor} mb-1`}>Fecha de Ingreso <span className="text-red-500">*</span></label>
              <input 
                required
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full px-4 py-2 border ${inputBorder} rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none ${inputBg} ${inputText}`}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4">
            <button 
              type="button" 
              onClick={() => navigate('/warehouse')}
              className={`px-6 py-2 border ${inputBorder} ${subTextColor} rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium`}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-medium flex items-center gap-2"
            >
              <Save size={20} />
              Guardar Ingreso
            </button>
          </div>
        </form>
      </div>

      <SupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSuccess={handleSupplierSuccess}
      />
    </div>
  );
};

export default WarehouseRegister;