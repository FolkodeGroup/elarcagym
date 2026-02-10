import React, { useState, useEffect } from 'react';
import { ProductsAPI, SalesAPI, ConfigAPI } from '../services/api';
import { Product } from '../types';
import { ShoppingCart, Plus, Minus, Trash2, Edit2, Search, AlertTriangle } from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';
import Toast from '../components/Toast';

const Admin: React.FC = () => {
    // Gestión de configuración
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [monthlyFee, setMonthlyFee] = useState('35000');
    const [isLoadingConfig, setIsLoadingConfig] = useState(true);

    // Cargar configuración desde la API
    const loadConfig = async () => {
        try {
            setIsLoadingConfig(true);
            const config = await ConfigAPI.get('monthly_fee');
            setMonthlyFee(config.value);
        } catch (error) {
            // Si no existe, usar valor por defecto
            console.log('Config not found, using default');
            setMonthlyFee('35000');
        } finally {
            setIsLoadingConfig(false);
        }
    };

    // Guardar configuración
    const saveConfig = async () => {
        try {
            await ConfigAPI.set('monthly_fee', monthlyFee, 'Cuota mensual del gimnasio');
            setToast({ message: 'Configuración guardada exitosamente', type: 'success' });
            setShowConfigModal(false);
        } catch (error) {
            console.error('Error saving config:', error);
            setToast({ message: 'Error al guardar configuración', type: 'error' });
        }
    };

    useEffect(() => {
        loadConfig();
    }, []);

    // Gestión de edición/eliminación de categorías
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [editCategoryValue, setEditCategoryValue] = useState('');
    const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
    const [reassignCategory, setReassignCategory] = useState('OTHER');

    // Actualizar productos al editar/eliminar categoría
    const updateProductsCategory = (oldCat: string, newCat: string) => {
        const updated = inventory.map(p =>
            p.category === oldCat ? { ...p, category: newCat } : p
        );
        setInventory(updated);
        localStorage.setItem('inventory', JSON.stringify(updated));
    };

    // Eliminar categoría y reasignar productos
    const handleDeleteCategory = () => {
        if (!categoryToDelete) return;
        // Reasignar productos
        updateProductsCategory(categoryToDelete, reassignCategory);
        // Quitar categoría
        const updatedCategories = categories.filter(cat => cat !== categoryToDelete);
        setCategories(updatedCategories);
        localStorage.setItem('categories', JSON.stringify(updatedCategories));
        setCategoryToDelete(null);
        setShowCategoryManager(false);
        setReassignCategory('OTHER');
    };

    // Editar nombre de categoría
    const handleEditCategory = () => {
        if (!editingCategory || !editCategoryValue.trim()) return;
        const newCat = editCategoryValue.trim().toUpperCase();
        // Actualizar productos
        updateProductsCategory(editingCategory, newCat);
        // Actualizar lista de categorías
        const updatedCategories = categories.map(cat =>
            cat === editingCategory ? newCat : cat
        );
        setCategories(updatedCategories);
        localStorage.setItem('categories', JSON.stringify(updatedCategories));
        setEditingCategory(null);
        setEditCategoryValue('');
        setShowCategoryManager(false);
    };

    const [inventory, setInventory] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [cart, setCart] = useState<{product: Product, qty: number}[]>([]);
    const [searchFilter, setSearchFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [newProductForm, setNewProductForm] = useState({ name: '', price: '', category: 'OTHER', stock: '', newCategory: '' });
    const [editProductForm, setEditProductForm] = useState({ name: '', price: '', category: 'OTHER', stock: '', newCategory: '' });
    
    // Estado para eliminar producto
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);

    // Cargar inventario desde API
    const loadInventory = async () => {
        try {
            setIsLoading(true);
            const data = await ProductsAPI.list();
            setInventory(data);
        } catch (error) {
            console.error('Error loading inventory:', error);
            setToast({ message: 'Error al cargar inventario', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadInventory();
    }, []);

    // Categorías dinámicas
    const DEFAULT_CATEGORIES = ["SUPPLEMENT", "DRINK", "MERCHANDISE", "OTHER"];
    const [categories, setCategories] = useState<string[]>(() => {
        const stored = localStorage.getItem('categories');
        return stored ? JSON.parse(stored) : DEFAULT_CATEGORIES;
    });
    // Para saber si el usuario está agregando una nueva categoría
    const [addingNewCategory, setAddingNewCategory] = useState(false);
    const { setCanNavigate } = useNavigation();

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const addToCart = (product: Product) => {
    // Validate stock
    if (product.stock <= 0) {
      setToast({ message: `No hay más unidades de "${product.name}".`, type: 'error' });
      return;
    }
    setCart(prev => {
        const existing = prev.find(p => p.product.id === product.id);
        if(existing) {
            if (existing.qty + 1 > product.stock) {
                setToast({ message: `No hay suficiente stock de "${product.name}".`, type: 'error' });
                return prev;
            }
            return prev.map(p => p.product.id === product.id ? {...p, qty: p.qty + 1} : p);
        }
        return [...prev, { product, qty: 1 }];
    });
  };

    const increaseQty = (productId: string) => {
        const prod = inventory.find(i => i.id === productId);
        setCart(prev => prev.map(p => {
            if (p.product.id !== productId) return p;
            if (prod && p.qty + 1 > prod.stock) {
                setToast({ message: `No hay suficiente stock de "${p.product.name}".`, type: 'error' });
                return p;
            }
            return { ...p, qty: p.qty + 1 };
        }));
    };

    const decreaseQty = (productId: string) => {
        setCart(prev => {
            return prev.flatMap(p => {
                if (p.product.id !== productId) return p;
                const newQty = p.qty - 1;
                if (newQty <= 0) return []; // remove item
                return [{ ...p, qty: newQty }];
            });
        });
    };

  const removeFromCart = (productId: string) => {
      setCart(prev => prev.filter(p => p.product.id !== productId));
  };

  const getTotal = () => cart.reduce((acc, item) => acc + (item.product.price * item.qty), 0);

  const handleCheckout = async () => {
      if(cart.length === 0) return;
      try {
          await SalesAPI.create({
              items: cart.map(c => ({ productId: c.product.id, quantity: c.qty })),
              total: getTotal()
          });
          setCart([]);
          setToast({ message: 'Venta registrada con éxito.', type: 'success' });
          // After checkout, allow navigation again
          setCanNavigate(true);
          // Refresh inventory from API after sale
          await loadInventory();
      } catch (error) {
          console.error('Error recording sale:', error);
          setToast({ message: 'Error al registrar venta', type: 'error' });
      }
  };

  const handleConfirmDeleteProduct = async () => {
      if (!productToDelete) return;
      
      try {
          await ProductsAPI.delete(productToDelete.id);
          await loadInventory();
          setToast({ message: `Producto "${productToDelete.name}" eliminado correctamente.`, type: 'success' });
          // Si el producto estaba en el carrito, lo quitamos
          setCart(prev => prev.filter(item => item.product.id !== productToDelete.id));
      } catch (error) {
          console.error('Error deleting product:', error);
          setToast({ message: 'Error al eliminar el producto.', type: 'error' });
      }
      setProductToDelete(null); // Cerrar modal
  };

    const translateCategory = (cat: string) => {
        switch(cat) {
            case 'SUPPLEMENT': return 'Suplementos';
            case 'DRINK': return 'Bebidas';
            case 'MERCHANDISE': return 'Indumentaria';
            case 'OTHER': return 'Otros';
            default:
                // Formato: primera letra mayúscula, resto minúsculas
                if (typeof cat === 'string' && cat.length > 0) {
                    // Evitar mostrar "Categoría" como nombre de categoría
                    const formatted = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
                    return formatted === 'Categoría' ? '' : formatted;
                }
                return cat;
        }
    };

    // Al cargar inventario, actualizar categorías dinámicamente y persistir en localStorage
    useEffect(() => {
        const unique = Array.from(new Set([
            ...categories,
            ...inventory.map(p => p.category)
        ]));
        setCategories(unique);
        localStorage.setItem('categories', JSON.stringify(unique));
    }, [inventory]);

  // Filter products based on search and category
  const filteredInventory = inventory.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchFilter.toLowerCase());
      const matchesCategory = categoryFilter === 'ALL' || product.category === categoryFilter;
      return matchesSearch && matchesCategory;
  });

    // Block navigation when there are items in the cart
    useEffect(() => {
        setCanNavigate(cart.length === 0);
    }, [cart, setCanNavigate]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
      {/* Product Grid */}
      <div className="lg:col-span-2 overflow-auto pr-2">
                <div className="mb-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
                            <h2 className="text-2xl font-display font-bold text-white">Productos</h2>
                            <div className="flex gap-2">
                                <button
                                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all bg-gray-800 text-gray-200 hover:bg-brand-gold hover:text-black"
                                    onClick={() => setShowConfigModal(true)}
                                >
                                    ⚙️ Configuración
                                </button>
                                <button
                                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all bg-gray-800 text-gray-200 hover:bg-brand-gold hover:text-black"
                                    onClick={() => setShowCategoryManager(true)}
                                >
                                    Gestionar categorías
                                </button>
                            </div>
                        </div>
                        {/* Modal de gestión de categorías */}
                        {showCategoryManager && !editingCategory && !categoryToDelete && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center">
                                <div className="absolute inset-0 bg-black/60" onClick={() => setShowCategoryManager(false)} />
                                <div className="bg-[#0b0b0b] p-6 rounded-lg border border-gray-800 z-10 w-full max-w-md" onClick={e => e.stopPropagation()}>
                                    <h4 className="text-lg font-bold mb-4 text-white">Categorías</h4>
                                    <ul className="mb-4">
                                        {categories
                                            .filter(cat => translateCategory(cat) !== '' && cat !== 'CATEGORY')
                                            .map(cat => (
                                                <li key={cat} className="flex items-center justify-between mb-2">
                                                    <span className="text-white">{translateCategory(cat)}</span>
                                                    <div className="flex gap-2">
                                                        <button className="text-xs px-2 py-1 bg-blue-700 text-white rounded hover:bg-blue-500 cursor-pointer" onClick={() => { setEditingCategory(cat); setEditCategoryValue(cat); setShowCategoryManager(false); }}>Editar</button>
                                                        <button className="text-xs px-2 py-1 bg-red-700 text-white rounded hover:bg-red-500 cursor-pointer" onClick={() => { setCategoryToDelete(cat); setShowCategoryManager(false); }}>Eliminar</button>
                                                    </div>
                                                </li>
                                            ))}
                                    </ul>
                                    <button className="mt-2 px-4 py-2 rounded bg-gray-700 text-white w-full cursor-pointer" onClick={() => setShowCategoryManager(false)}>Cerrar</button>
                                    <button className="mt-2 px-4 py-2 rounded bg-brand-gold text-black w-full font-bold cursor-pointer" onClick={() => {
                                        const newCatName = prompt('Nombre de la nueva categoría:');
                                        if (newCatName && newCatName.trim()) {
                                            const formatted = newCatName.trim().toUpperCase();
                                            if (!categories.includes(formatted)) {
                                                const updated = [...categories, formatted];
                                                setCategories(updated);
                                                localStorage.setItem('categories', JSON.stringify(updated));
                                                setToast({ message: `Categoría "${formatted}" agregada.`, type: 'success' });
                                            } else {
                                                setToast({ message: 'Esa categoría ya existe.', type: 'error' });
                                            }
                                        }
                                    }}>+ Nueva Categoría</button>
                                </div>
                            </div>
                        )}

                        {/* Modal editar categoría */}
                        {editingCategory && (
                            <div className="fixed inset-0 z-60 flex items-center justify-center">
                                <div className="absolute inset-0 bg-black/70" onClick={() => { setEditingCategory(null); setShowCategoryManager(true); }} />
                                <div className="bg-[#111] p-6 rounded-lg border border-gray-800 z-20 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                                    <h4 className="text-lg font-bold mb-2 text-white">Editar categoría</h4>
                                    <input className="w-full bg-black border border-gray-700 p-2 rounded text-white mb-3" value={editCategoryValue} onChange={e => setEditCategoryValue(e.target.value)} />
                                    <div className="flex gap-2 justify-end">
                                        <button className="px-4 py-2 rounded bg-gray-700 text-white cursor-pointer" onClick={() => { setEditingCategory(null); setShowCategoryManager(true); }}>Cancelar</button>
                                        <button className="px-4 py-2 rounded bg-brand-gold text-black cursor-pointer" onClick={() => { handleEditCategory(); setShowCategoryManager(true); }}>Guardar</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Modal eliminar categoría */}
                        {categoryToDelete && (() => {
                            const productsInCategory = inventory.filter(p => p.category === categoryToDelete);
                            if (productsInCategory.length > 0) {
                                // Modal de reasignación
                                return (
                                    <div className="fixed inset-0 z-60 flex items-center justify-center">
                                        <div className="absolute inset-0 bg-black/70" onClick={() => { setCategoryToDelete(null); setShowCategoryManager(true); }} />
                                        <div className="bg-[#111] p-6 rounded-lg border border-gray-800 z-20 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                                            <h4 className="text-lg font-bold mb-2 text-white">Eliminar categoría</h4>
                                            <p className="text-white mb-3">¿A qué categoría deseas reasignar los productos de <b>{translateCategory(categoryToDelete)}</b>?</p>
                                            <select className="w-full bg-black border border-gray-700 p-2 rounded text-white mb-3" value={reassignCategory} onChange={e => setReassignCategory(e.target.value)}>
                                                {categories.filter(cat => cat !== categoryToDelete).map(cat => (
                                                    <option key={cat} value={cat}>{translateCategory(cat)}</option>
                                                ))}
                                            </select>
                                            <div className="flex gap-2 justify-end">
                                                <button className="px-4 py-2 rounded bg-gray-700 text-white cursor-pointer" onClick={() => { setCategoryToDelete(null); setShowCategoryManager(true); }}>Cancelar</button>
                                                <button className="px-4 py-2 rounded bg-red-600 text-white cursor-pointer" onClick={() => { handleDeleteCategory(); setShowCategoryManager(true); }}>Eliminar</button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            } else {
                                // Modal de confirmación simple
                                return (
                                    <div className="fixed inset-0 z-60 flex items-center justify-center">
                                        <div className="absolute inset-0 bg-black/70" onClick={() => { setCategoryToDelete(null); setShowCategoryManager(true); }} />
                                        <div className="bg-[#111] p-6 rounded-lg border border-gray-800 z-20 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                                            <h4 className="text-lg font-bold mb-2 text-white">Eliminar categoría</h4>
                                            <p className="text-white mb-3">¿Seguro que deseas eliminar la categoría <b>{translateCategory(categoryToDelete)}</b>? No hay productos en esta categoría.</p>
                                            <div className="flex gap-2 justify-end">
                                                <button className="px-4 py-2 rounded bg-gray-700 text-white cursor-pointer" onClick={() => { setCategoryToDelete(null); setShowCategoryManager(true); }}>Cancelar</button>
                                                <button className="px-4 py-2 rounded bg-red-600 text-white cursor-pointer" onClick={() => { handleDeleteCategory(); setShowCategoryManager(true); }}>Eliminar</button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                        })()}
            
            {/* Search and Filter Controls */}
                                <div className="flex gap-2 flex-wrap mb-4">
                                    <button
                                        onClick={() => setCategoryFilter('ALL')}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                            categoryFilter === 'ALL'
                                                ? 'bg-brand-gold text-black'
                                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                        }`}
                                    >
                                        Todos
                                    </button>
                                        {categories.map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setCategoryFilter(cat)}
                                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                                    categoryFilter === cat
                                                        ? 'bg-brand-gold text-black'
                                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                                }`}
                                            >
                                                {translateCategory(cat)}
                                            </button>
                                        ))}
            </div>

            {/* Add Product Button */}
            <button onClick={() => setShowAddModal(true)} className="bg-brand-gold text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-yellow-500 transition shadow-lg"> 
                <Plus size={18} /> Nuevo Producto
            </button>
        </div>

        {/* Product Count */}
        <p className="text-sm text-gray-400 mb-3">{filteredInventory.length} producto{filteredInventory.length !== 1 ? 's' : ''}</p>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredInventory.map(product => (
                <div 
                    key={product.id}
                    className="bg-[#1a1a1a] border border-gray-800 p-4 rounded-xl text-left hover:border-brand-gold transition group cursor-pointer"
                    onClick={() => addToCart(product)}
                >
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-gray-500 bg-black px-2 py-1 rounded uppercase tracking-wider">{translateCategory(product.category)}</span>
                        <span className="text-sm font-bold text-brand-gold">${product.price}</span>
                    </div>
                    <h3 className="font-bold text-white group-hover:text-brand-gold transition-colors truncate">{product.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">Stock: {product.stock}
                        {product.stock <= 10 && (
                            <span className="ml-2 text-[10px] font-bold text-red-500">Bajo</span>
                        )}
                    </p>
                    <div className="mt-3 flex gap-2">
                        <button 
                            type="button" 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                setEditingProduct(product); 
                                setEditProductForm({ name: product.name, price: String(product.price), category: product.category, stock: String(product.stock), newCategory: '' }); 
                                setShowEditModal(true); 
                            }} 
                            className="text-gray-300 bg-gray-800 p-2 rounded hover:bg-gray-700"
                        >
                            <Edit2 size={14} />
                        </button>
                        <button 
                            type="button" 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                setProductToDelete(product);
                            }} 
                            className="text-red-400 bg-gray-800 p-2 rounded hover:bg-gray-700"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Cart Panel */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl flex flex-col h-full overflow-hidden shadow-2xl">
         <div className="p-6 border-b border-gray-800 bg-black/20 text-center">
             <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2">
                 <ShoppingCart size={20} className="text-brand-gold" /> Carrito de Venta
             </h3>
         </div>
         
         <div className="flex-1 overflow-auto p-4 space-y-3 bg-black/10">
             {cart.length === 0 ? (
                 <p className="text-center text-gray-600 mt-10">Agrega productos...</p>
             ) : (
                 cart.map(item => (
                     <div key={item.product.id} className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-gray-800">
                         <div className="flex-1 min-w-0">
                             <p className="text-white text-sm font-bold truncate">{item.product.name}</p>
                             <p className="text-brand-gold text-xs font-mono">${item.product.price}</p>
                         </div>
                         <div className="flex items-center gap-2">
                             <button onClick={() => decreaseQty(item.product.id)} className="bg-gray-800 p-1 rounded text-gray-300 hover:bg-gray-700 transition">
                                 <Minus size={14} />
                             </button>
                             <span className="text-sm text-white font-mono w-6 text-center">{item.qty}</span>
                             <button onClick={() => increaseQty(item.product.id)} className="bg-gray-800 p-1 rounded text-gray-300 hover:bg-gray-700 transition">
                                 <Plus size={14} />
                             </button>
                         </div>
                     </div>
                 ))
             )}
         </div>

         <div className="p-6 bg-black border-t border-gray-800 mt-auto">
             <div className="flex justify-between items-center mb-6">
                 <span className="text-gray-500 uppercase text-[10px] font-black tracking-[0.2em]">Total</span>
                 <span className="text-3xl font-display font-bold text-white">${getTotal().toFixed(2)}</span>
             </div>
             <button 
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full bg-brand-gold text-black font-black py-4 rounded-xl hover:bg-yellow-500 disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-tighter transition-all active:scale-95 shadow-lg shadow-brand-gold/10"
             >
                 REGISTRAR VENTA
             </button>
         </div>
      </div>

            {/* Modales de producto */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
                    <div className="bg-[#0b0b0b] p-6 rounded-3xl border border-gray-800 z-10 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-6">Nuevo Producto</h4>
                        <div className="space-y-4">
                            <input className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white outline-none focus:border-brand-gold" placeholder="Nombre" value={newProductForm.name} onChange={e => setNewProductForm({...newProductForm, name: e.target.value})} />
                            <div className="grid grid-cols-2 gap-4">
                                <input className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white outline-none focus:border-brand-gold" placeholder="Precio" type="number" value={newProductForm.price} onChange={e => setNewProductForm({...newProductForm, price: e.target.value})} />
                                <input className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white outline-none focus:border-brand-gold" placeholder="Stock" type="number" value={newProductForm.stock} onChange={e => setNewProductForm({...newProductForm, stock: e.target.value})} />
                            </div>
                            <select
                                className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white outline-none"
                                value={addingNewCategory ? 'NEW' : newProductForm.category}
                                onChange={e => {
                                    if (e.target.value === 'NEW') {
                                        setAddingNewCategory(true);
                                        setNewProductForm({ ...newProductForm, newCategory: '' });
                                    } else {
                                        setAddingNewCategory(false);
                                        setNewProductForm({ ...newProductForm, category: e.target.value });
                                    }
                                }}
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{translateCategory(cat)}</option>
                                ))}
                                <option value="NEW">+ Nueva categoría…</option>
                            </select>
                            {addingNewCategory && (
                                <input
                                    className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white outline-none border-brand-gold"
                                    placeholder="Nombre de la nueva categoría"
                                    value={newProductForm.newCategory}
                                    onChange={e => setNewProductForm({ ...newProductForm, newCategory: e.target.value })}
                                />
                            )}
                            <div className="flex gap-3 pt-4">
                                <button className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 font-bold" onClick={() => setShowAddModal(false)}>CANCELAR</button>
                                <button className="flex-1 py-3 rounded-xl bg-brand-gold text-black font-black uppercase tracking-tighter shadow-lg shadow-brand-gold/10" onClick={async () => {
                                    let categoryToUse = newProductForm.category;
                                    if (addingNewCategory && newProductForm.newCategory.trim()) {
                                        categoryToUse = newProductForm.newCategory.trim().toUpperCase();
                                        if (!categories.includes(categoryToUse)) {
                                            const updated = [...categories, categoryToUse];
                                            setCategories(updated);
                                            localStorage.setItem('categories', JSON.stringify(updated));
                                        }
                                    }
                                    try {
                                        await ProductsAPI.create({ name: newProductForm.name, price: Number(newProductForm.price), category: categoryToUse, stock: Number(newProductForm.stock) });
                                        await loadInventory();
                                        setToast({ message: `Producto agregado.`, type: 'success' });
                                        setShowAddModal(false);
                                        setAddingNewCategory(false);
                                        setNewProductForm({ name: '', price: '', category: 'OTHER', stock: '', newCategory: '' });
                                    } catch (error) {
                                        console.error('Error adding product:', error);
                                        setToast({ message: 'Error al agregar producto', type: 'error' });
                                    }
                                }}>CREAR</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showEditModal && editingProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
                    <div className="bg-[#0b0b0b] p-6 rounded-3xl border border-gray-800 z-10 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-6">Editar Producto</h4>
                        <div className="space-y-4">
                            <input className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white outline-none focus:border-brand-gold" placeholder="Nombre" value={editProductForm.name} onChange={e => setEditProductForm({...editProductForm, name: e.target.value})} />
                            <div className="grid grid-cols-2 gap-4">
                                <input className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white outline-none focus:border-brand-gold" placeholder="Precio" type="number" value={editProductForm.price} onChange={e => setEditProductForm({...editProductForm, price: e.target.value})} />
                                <input className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white outline-none focus:border-brand-gold" placeholder="Stock" type="number" value={editProductForm.stock} onChange={e => setEditProductForm({...editProductForm, stock: e.target.value})} />
                            </div>
                            <select
                                className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white outline-none"
                                value={addingNewCategory ? 'NEW' : editProductForm.category}
                                onChange={e => {
                                    if (e.target.value === 'NEW') {
                                        setAddingNewCategory(true);
                                        setEditProductForm({ ...editProductForm, newCategory: '' });
                                    } else {
                                        setAddingNewCategory(false);
                                        setEditProductForm({ ...editProductForm, category: e.target.value });
                                    }
                                }}
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{translateCategory(cat)}</option>
                                ))}
                                <option value="NEW">+ Nueva categoría…</option>
                            </select>
                            {addingNewCategory && (
                                <input
                                    className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white outline-none border-brand-gold"
                                    placeholder="Nombre de la nueva categoría"
                                    value={editProductForm.newCategory}
                                    onChange={e => setEditProductForm({ ...editProductForm, newCategory: e.target.value })}
                                />
                            )}
                            <div className="flex gap-3 pt-4">
                                <button className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 font-bold" onClick={() => setShowEditModal(false)}>CANCELAR</button>
                                <button className="flex-1 py-3 rounded-xl bg-brand-gold text-black font-black uppercase tracking-tighter shadow-lg shadow-brand-gold/10" onClick={async () => {
                                    let categoryToUse = editProductForm.category;
                                    if (addingNewCategory && editProductForm.newCategory.trim()) {
                                        categoryToUse = editProductForm.newCategory.trim().toUpperCase();
                                        if (!categories.includes(categoryToUse)) {
                                            const updated = [...categories, categoryToUse];
                                            setCategories(updated);
                                            localStorage.setItem('categories', JSON.stringify(updated));
                                        }
                                    }
                                    try {
                                        await ProductsAPI.update(editingProduct.id, { name: editProductForm.name, price: Number(editProductForm.price), category: categoryToUse, stock: Number(editProductForm.stock) });
                                        await loadInventory();
                                        setToast({ message: `Cambios guardados.`, type: 'success' });
                                        setShowEditModal(false);
                                        setAddingNewCategory(false);
                                    } catch (error) {
                                        console.error('Error updating product:', error);
                                        setToast({ message: 'Error al actualizar producto', type: 'error' });
                                    }
                                }}>GUARDAR</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {productToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="absolute inset-0" onClick={() => setProductToDelete(null)} />
                    <div className="bg-[#111] p-6 rounded-3xl border border-gray-800 w-full max-w-sm shadow-2xl z-10" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4 text-red-500">
                            <AlertTriangle size={24} />
                            <h4 className="text-lg font-bold">¿Eliminar producto?</h4>
                        </div>
                        <p className="text-gray-300 text-sm mb-6 uppercase tracking-widest font-bold">
                            Seguro deseas quitar <span className="text-white">"{productToDelete.name}"</span> del inventario?
                        </p>
                        <div className="flex gap-3">
                            <button className="flex-1 py-2 rounded-xl bg-gray-800 text-gray-400 font-bold text-xs cursor-pointer" onClick={() => setProductToDelete(null)}>CANCELAR</button>
                            <button className="flex-1 py-2 rounded-xl bg-red-600 text-white font-bold text-xs cursor-pointer" onClick={handleConfirmDeleteProduct}>SÍ, ELIMINAR</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de configuración */}
            {showConfigModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="absolute inset-0" onClick={() => setShowConfigModal(false)} />
                    <div className="bg-[#111] p-6 rounded-3xl border border-gray-800 w-full max-w-md shadow-2xl z-10" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-white mb-6">⚙️ Configuración del Gimnasio</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Cuota Mensual (ARS)</label>
                                <input
                                    type="number"
                                    value={monthlyFee}
                                    onChange={(e) => setMonthlyFee(e.target.value)}
                                    className="w-full bg-black border border-gray-700 text-white p-3 rounded-lg text-lg font-mono"
                                    placeholder="35000"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Este valor se usará automáticamente al registrar pagos de cuota mensual
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 mt-6">
                            <div className="flex gap-3">
                                <button 
                                    className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 font-bold hover:bg-gray-700 transition"
                                    onClick={() => setShowConfigModal(false)}
                                >
                                    CANCELAR
                                </button>
                                <button 
                                    className="flex-1 py-3 rounded-xl bg-brand-gold text-black font-black uppercase tracking-tighter shadow-lg shadow-brand-gold/10 hover:bg-yellow-500 transition"
                                    onClick={saveConfig}
                                >
                                    GUARDAR
                                </button>
                            </div>
                            <button
                                className="w-full py-3 rounded-xl bg-green-600 text-white font-bold uppercase tracking-tighter shadow-lg hover:bg-green-700 transition flex items-center justify-center gap-2 mt-2"
                                onClick={async () => {
                                    try {
                                        const token = localStorage.getItem('auth_token');
                                        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/config/backup/export-excel`, {
                                            method: 'GET',
                                            headers: token ? { Authorization: `Bearer ${token}` } : {},
                                        });
                                        if (!res.ok) throw new Error('Error al descargar respaldo');
                                        const blob = await res.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = 'respaldo-el-arca-gym.xlsx';
                                        document.body.appendChild(a);
                                        a.click();
                                        a.remove();
                                        window.URL.revokeObjectURL(url);
                                        setToast({ message: 'Respaldo descargado correctamente.', type: 'success' });
                                    } catch (error) {
                                        setToast({ message: 'Error al descargar respaldo.', type: 'error' });
                                    }
                                }}
                            >
                                📥 Descargar Respaldo Completo
                            </button>
                            <form
                                className="w-full flex flex-col gap-2 mt-2"
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    const input = document.getElementById('import-respaldo-input') as HTMLInputElement;
                                    if (!input.files || input.files.length === 0) {
                                        setToast({ message: 'Selecciona un archivo Excel.', type: 'error' });
                                        return;
                                    }
                                    const file = input.files[0];
                                    const formData = new FormData();
                                    formData.append('file', file);
                                    try {
                                        const token = localStorage.getItem('auth_token');
                                        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/config/backup/import-excel`, {
                                            method: 'POST',
                                            headers: token ? { Authorization: `Bearer ${token}` } : {},
                                            body: formData,
                                        });
                                        if (!res.ok) throw new Error('Error al importar respaldo');
                                        const result = await res.json();
                                        setToast({ message: 'Respaldo importado correctamente.', type: 'success' });
                                    } catch (error) {
                                        setToast({ message: 'Error al importar respaldo.', type: 'error' });
                                    }
                                }}
                            >
                                <label htmlFor="import-respaldo-input" className="block text-sm text-gray-400 mb-1">Importar respaldo Excel</label>
                                <input id="import-respaldo-input" type="file" accept=".xlsx" className="w-full bg-black border border-gray-700 text-white p-2 rounded-lg" />
                                <button type="submit" className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold uppercase tracking-tighter shadow-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 mt-2">📤 Importar Respaldo</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
  );
};

export default Admin;