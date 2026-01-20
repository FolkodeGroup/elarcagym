import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Product } from '../types';
import { ShoppingCart, Plus, Minus, Trash2, Edit2, Search } from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';
import Toast from '../components/Toast';

const Admin: React.FC = () => {
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
    const [inventory, setInventory] = useState<Product[]>(db.getInventory());
    const [cart, setCart] = useState<{product: Product, qty: number}[]>([]);
    const [searchFilter, setSearchFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [newProductForm, setNewProductForm] = useState({ name: '', price: '', category: 'OTHER', stock: '', newCategory: '' });
    const [editProductForm, setEditProductForm] = useState({ name: '', price: '', category: 'OTHER', stock: '', newCategory: '' });
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

  const handleCheckout = () => {
      if(cart.length === 0) return;
      db.recordSale(cart.map(c => ({ productId: c.product.id, quantity: c.qty })));
      setCart([]);
      setToast({ message: 'Venta registrada con éxito.', type: 'success' });
      // After checkout, allow navigation again
      setCanNavigate(true);
      // Refresh inventory from DB after sale
      setInventory(db.getInventory());
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
      const matchesSearch = product.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
                           product.category.toLowerCase().includes(searchFilter.toLowerCase());
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
                            <button
                                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all bg-gray-800 text-gray-200 hover:bg-brand-gold hover:text-black"
                                style={{ minWidth: '160px' }}
                                onClick={() => setShowCategoryManager(true)}
                            >
                                Gestionar categorías
                            </button>
                        </div>
                        {/* Modal de gestión de categorías */}
                        {showCategoryManager && !editingCategory && !categoryToDelete && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center">
                                <div className="absolute inset-0 bg-black/60" onClick={() => setShowCategoryManager(false)} />
                                <div className="bg-[#0b0b0b] p-6 rounded-lg border border-gray-800 z-10 w-full max-w-md">
                                    <h4 className="text-lg font-bold mb-4 text-white">Categorías</h4>
                                    <ul className="mb-4">
                                        {categories
                                            .filter(cat => translateCategory(cat) !== '' && cat !== 'CATEGORY')
                                            .map(cat => (
                                                <li key={cat} className="flex items-center justify-between mb-2">
                                                    <span className="text-white">{translateCategory(cat)}</span>
                                                    <div className="flex gap-2">
                                                        <button className="text-xs px-2 py-1 bg-blue-700 text-white rounded hover:bg-blue-500" onClick={() => { setEditingCategory(cat); setEditCategoryValue(cat); setShowCategoryManager(false); }}>Editar</button>
                                                        <button className="text-xs px-2 py-1 bg-red-700 text-white rounded hover:bg-red-500" onClick={() => { setCategoryToDelete(cat); setShowCategoryManager(false); }}>Eliminar</button>
                                                    </div>
                                                </li>
                                            ))}
                                    </ul>
                                    <button className="mt-2 px-4 py-2 rounded bg-gray-700 text-white w-full" onClick={() => setShowCategoryManager(false)}>Cerrar</button>
                                </div>
                            </div>
                        )}

                        {/* Modal editar categoría */}
                        {editingCategory && (
                            <div className="fixed inset-0 z-60 flex items-center justify-center">
                                <div className="absolute inset-0 bg-black/70" onClick={() => { setEditingCategory(null); setShowCategoryManager(true); }} />
                                <div className="bg-[#111] p-6 rounded-lg border border-gray-800 z-20 w-full max-w-sm">
                                    <h4 className="text-lg font-bold mb-2 text-white">Editar categoría</h4>
                                    <input className="w-full bg-black border border-gray-700 p-2 rounded text-white mb-3" value={editCategoryValue} onChange={e => setEditCategoryValue(e.target.value)} />
                                    <div className="flex gap-2 justify-end">
                                        <button className="px-4 py-2 rounded bg-gray-700 text-white" onClick={() => { setEditingCategory(null); setShowCategoryManager(true); }}>Cancelar</button>
                                        <button className="px-4 py-2 rounded bg-brand-gold text-black" onClick={() => { handleEditCategory(); setShowCategoryManager(true); }}>Guardar</button>
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
                                        <div className="bg-[#111] p-6 rounded-lg border border-gray-800 z-20 w-full max-w-sm">
                                            <h4 className="text-lg font-bold mb-2 text-white">Eliminar categoría</h4>
                                            <p className="text-white mb-3">¿A qué categoría deseas reasignar los productos de <b>{translateCategory(categoryToDelete)}</b>?</p>
                                            <select className="w-full bg-black border border-gray-700 p-2 rounded text-white mb-3" value={reassignCategory} onChange={e => setReassignCategory(e.target.value)}>
                                                {categories.filter(cat => cat !== categoryToDelete).map(cat => (
                                                    <option key={cat} value={cat}>{translateCategory(cat)}</option>
                                                ))}
                                            </select>
                                            <div className="flex gap-2 justify-end">
                                                <button className="px-4 py-2 rounded bg-gray-700 text-white" onClick={() => { setCategoryToDelete(null); setShowCategoryManager(true); }}>Cancelar</button>
                                                <button className="px-4 py-2 rounded bg-red-600 text-white" onClick={() => { handleDeleteCategory(); setShowCategoryManager(true); }}>Eliminar</button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            } else {
                                // Modal de confirmación simple
                                return (
                                    <div className="fixed inset-0 z-60 flex items-center justify-center">
                                        <div className="absolute inset-0 bg-black/70" onClick={() => { setCategoryToDelete(null); setShowCategoryManager(true); }} />
                                        <div className="bg-[#111] p-6 rounded-lg border border-gray-800 z-20 w-full max-w-sm">
                                            <h4 className="text-lg font-bold mb-2 text-white">Eliminar categoría</h4>
                                            <p className="text-white mb-3">¿Seguro que deseas eliminar la categoría <b>{translateCategory(categoryToDelete)}</b>? No hay productos en esta categoría.</p>
                                            <div className="flex gap-2 justify-end">
                                                <button className="px-4 py-2 rounded bg-gray-700 text-white" onClick={() => { setCategoryToDelete(null); setShowCategoryManager(true); }}>Cancelar</button>
                                                <button className="px-4 py-2 rounded bg-red-600 text-white" onClick={() => { handleDeleteCategory(); setShowCategoryManager(true); }}>Eliminar</button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                        })()}
            {/* Eliminado título repetido de Productos */}
            
            {/* Search and Filter Controls */}
                                <div className="flex gap-2 flex-wrap">
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
            <button onClick={() => setShowAddModal(true)} className="bg-brand-gold text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-yellow-500 transition"> 
                <Plus size={18} /> Nuevo Producto
            </button>
        </div>

        {/* Product Count */}
        <p className="text-sm text-gray-400 mb-3">{filteredInventory.length} producto{filteredInventory.length !== 1 ? 's' : ''}</p>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredInventory.map(product => (
                <button 
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="bg-[#1a1a1a] border border-gray-800 p-4 rounded-xl text-left hover:border-brand-gold transition group"
                >
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-gray-500 bg-black px-2 py-1 rounded">{translateCategory(product.category)}</span>
                        <span className="text-sm font-bold text-brand-gold">${product.price}</span>
                    </div>
                    <h3 className="font-bold text-white group-hover:text-brand-gold transition-colors">{product.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">Stock: {product.stock}
                        {product.stock <= 10 && (
                            <span className="ml-2 text-xs font-bold text-red-500">Bajo stock</span>
                        )}
                    </p>
                    <div className="mt-3 flex gap-2">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setEditingProduct(product); setEditProductForm({ name: product.name, price: String(product.price), category: product.category, stock: String(product.stock) }); setShowEditModal(true); }} className="text-gray-300 bg-gray-800 p-2 rounded hover:bg-gray-700"><Edit2 size={14} /></button>
                    </div>
                </button>
            ))}
        </div>
      </div>

      {/* Cart Panel */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl flex flex-col h-full">
         <div className="p-6 border-b border-gray-800">
             <h3 className="text-lg font-bold text-white flex items-center gap-2">
                 <ShoppingCart /> Carrito de compras
             </h3>
         </div>
         
         <div className="flex-1 overflow-auto p-4 space-y-3">
             {cart.length === 0 ? (
                 <p className="text-center text-gray-500 mt-10">El carrito está vacío.</p>
             ) : (
                 cart.map(item => (
                     <div key={item.product.id} className="flex justify-between items-center bg-black/40 p-3 rounded">
                         <div className="flex-1">
                             <p className="text-white text-sm font-bold">{item.product.name}</p>
                             <p className="text-brand-gold text-xs">${item.product.price}</p>
                         </div>
                         <div className="flex items-center gap-2">
                             <button onClick={() => decreaseQty(item.product.id)} className="bg-gray-800 p-1 rounded text-gray-300 hover:bg-gray-700">
                                 <Minus size={14} />
                             </button>
                             <span className="text-sm text-white w-8 text-center">{item.qty}</span>
                             <button onClick={() => increaseQty(item.product.id)} className="bg-gray-800 p-1 rounded text-gray-300 hover:bg-gray-700">
                                 <Plus size={14} />
                             </button>
                             <button onClick={() => removeFromCart(item.product.id)} className="text-red-500 hover:text-red-400 ml-2">
                                 <Trash2 size={18} />
                             </button>
                         </div>
                     </div>
                 ))
             )}
         </div>

         <div className="p-6 bg-black border-t border-gray-800 mt-auto rounded-b-xl">
             <div className="flex justify-between items-center mb-6">
                 <span className="text-gray-400">Total</span>
                 <span className="text-3xl font-bold text-white">${getTotal().toFixed(2)}</span>
             </div>
             <button 
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full bg-brand-gold text-black font-bold py-4 rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
             >
                 CONFIRMAR VENTA
             </button>
         </div>
      </div>
            {toast && (
                <Toast message={toast.message} type={toast.type} duration={3000} onClose={() => setToast(null)} />
            )}
            {/* Add Product Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddModal(false)} />
                    <div className="bg-[#0b0b0b] p-6 rounded-lg border border-gray-800 z-10 w-full max-w-md">
                        <h4 className="text-lg font-bold mb-4">Nuevo Producto</h4>
                        <div className="space-y-3">
                            <input className="w-full bg-black border border-gray-700 p-2 rounded text-white" placeholder="Nombre" value={newProductForm.name} onChange={e => setNewProductForm({...newProductForm, name: e.target.value})} />
                            <input className="w-full bg-black border border-gray-700 p-2 rounded text-white" placeholder="Precio" value={newProductForm.price} onChange={e => setNewProductForm({...newProductForm, price: e.target.value})} />
                            <input className="w-full bg-black border border-gray-700 p-2 rounded text-white" placeholder="Stock" value={newProductForm.stock} onChange={e => setNewProductForm({...newProductForm, stock: e.target.value})} />
                                                        <select
                                                            className="w-full bg-black border border-gray-700 p-2 rounded text-white mb-2"
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
                                                                className="w-full bg-black border border-gray-700 p-2 rounded text-white mb-2"
                                                                placeholder="Nombre de la nueva categoría"
                                                                value={newProductForm.newCategory}
                                                                onChange={e => setNewProductForm({ ...newProductForm, newCategory: e.target.value })}
                                                            />
                                                        )}
                            <div className="flex justify-end gap-2 mt-4">
                                <button className="px-4 py-2 rounded bg-gray-700" onClick={() => setShowAddModal(false)}>Cancelar</button>
                                                                <button className="px-4 py-2 rounded bg-brand-gold text-black" onClick={() => {
                                                                    let categoryToUse = newProductForm.category;
                                                                    if (addingNewCategory && newProductForm.newCategory.trim()) {
                                                                        categoryToUse = newProductForm.newCategory.trim().toUpperCase();
                                                                        if (!categories.includes(categoryToUse)) {
                                                                            const updated = [...categories, categoryToUse];
                                                                            setCategories(updated);
                                                                            localStorage.setItem('categories', JSON.stringify(updated));
                                                                        }
                                                                    }
                                                                    const p = db.addProduct({ name: newProductForm.name, price: Number(newProductForm.price), category: categoryToUse, stock: Number(newProductForm.stock) });
                                                                    setInventory(db.getInventory());
                                                                    setToast({ message: `Producto "${p.name}" agregado.`, type: 'success' });
                                                                    setShowAddModal(false);
                                                                    setAddingNewCategory(false);
                                                                    setNewProductForm({ name: '', price: '', category: 'OTHER', stock: '', newCategory: '' });
                                                                }}>Crear</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Product Modal */}
            {showEditModal && editingProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowEditModal(false)} />
                    <div className="bg-[#0b0b0b] p-6 rounded-lg border border-gray-800 z-10 w-full max-w-md">
                        <h4 className="text-lg font-bold mb-4">Editar Producto</h4>
                        <div className="space-y-3">
                            <input className="w-full bg-black border border-gray-700 p-2 rounded text-white" placeholder="Nombre" value={editProductForm.name} onChange={e => setEditProductForm({...editProductForm, name: e.target.value})} />
                            <input className="w-full bg-black border border-gray-700 p-2 rounded text-white" placeholder="Precio" value={editProductForm.price} onChange={e => setEditProductForm({...editProductForm, price: e.target.value})} />
                            <input className="w-full bg-black border border-gray-700 p-2 rounded text-white" placeholder="Stock" value={editProductForm.stock} onChange={e => setEditProductForm({...editProductForm, stock: e.target.value})} />
                                                        <select
                                                            className="w-full bg-black border border-gray-700 p-2 rounded text-white mb-2"
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
                                                                className="w-full bg-black border border-gray-700 p-2 rounded text-white mb-2"
                                                                placeholder="Nombre de la nueva categoría"
                                                                value={editProductForm.newCategory}
                                                                onChange={e => setEditProductForm({ ...editProductForm, newCategory: e.target.value })}
                                                            />
                                                        )}
                            <div className="flex justify-end gap-2 mt-4">
                                <button className="px-4 py-2 rounded bg-gray-700" onClick={() => setShowEditModal(false)}>Cancelar</button>
                                                                <button className="px-4 py-2 rounded bg-brand-gold text-black" onClick={() => {
                                                                    if (!editingProduct) return;
                                                                    let categoryToUse = editProductForm.category;
                                                                    if (addingNewCategory && editProductForm.newCategory.trim()) {
                                                                        categoryToUse = editProductForm.newCategory.trim().toUpperCase();
                                                                        if (!categories.includes(categoryToUse)) {
                                                                            const updated = [...categories, categoryToUse];
                                                                            setCategories(updated);
                                                                            localStorage.setItem('categories', JSON.stringify(updated));
                                                                        }
                                                                    }
                                                                    const updated = db.updateProduct(editingProduct.id, { name: editProductForm.name, price: Number(editProductForm.price), category: categoryToUse, stock: Number(editProductForm.stock) });
                                                                    setInventory(db.getInventory());
                                                                    setToast({ message: `Producto "${updated?.name || editingProduct.name}" actualizado.`, type: 'success' });
                                                                    setShowEditModal(false);
                                                                    setAddingNewCategory(false);
                                                                    setEditingProduct(null);
                                                                }}>Guardar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
  );
};

export default Admin;