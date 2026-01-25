import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Product } from '../types';
import { ShoppingCart, Plus, Minus, Trash2, Edit2 } from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';
import Toast from '../components/Toast';

const Admin: React.FC = () => {
    const [inventory, setInventory] = useState<Product[]>(db.getInventory());
    const [cart, setCart] = useState<{product: Product, qty: number}[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [newProductForm, setNewProductForm] = useState({ name: '', price: '', category: 'OTHER', stock: '' });
    const [editProductForm, setEditProductForm] = useState({ name: '', price: '', category: 'OTHER', stock: '' });
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
          default: return cat;
      }
  };

    // Block navigation when there are items in the cart
    useEffect(() => {
        setCanNavigate(cart.length === 0);
    }, [cart, setCanNavigate]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
      {/* Product Grid */}
      <div className="lg:col-span-2 overflow-auto pr-2">
        <h2 className="text-2xl font-display font-bold text-white mb-6">Productos</h2>
        <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setShowAddModal(true)} className="bg-brand-gold text-black px-3 py-1 rounded font-bold flex items-center gap-2"> <Plus /> Nuevo Producto</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {inventory.map(product => (
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
                    <p className="text-xs text-gray-500 mt-1">Stock: {product.stock}</p>
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
                            <select className="w-full bg-black border border-gray-700 p-2 rounded text-white" value={newProductForm.category} onChange={e => setNewProductForm({...newProductForm, category: e.target.value})}>
                                <option value="SUPPLEMENT">Suplementos</option>
                                <option value="DRINK">Bebidas</option>
                                <option value="MERCHANDISE">Indumentaria</option>
                                <option value="OTHER">Otros</option>
                            </select>
                            <div className="flex justify-end gap-2 mt-4">
                                <button className="px-4 py-2 rounded bg-gray-700" onClick={() => setShowAddModal(false)}>Cancelar</button>
                                <button className="px-4 py-2 rounded bg-brand-gold text-black" onClick={() => {
                                    // create
                                    const p = db.addProduct({ name: newProductForm.name, price: Number(newProductForm.price), category: newProductForm.category, stock: Number(newProductForm.stock) });
                                    setInventory(db.getInventory());
                                    setToast({ message: `Producto "${p.name}" agregado.`, type: 'success' });
                                    setShowAddModal(false);
                                    setNewProductForm({ name: '', price: '', category: 'OTHER', stock: '' });
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
                            <select className="w-full bg-black border border-gray-700 p-2 rounded text-white" value={editProductForm.category} onChange={e => setEditProductForm({...editProductForm, category: e.target.value})}>
                                <option value="SUPPLEMENT">Suplementos</option>
                                <option value="DRINK">Bebidas</option>
                                <option value="MERCHANDISE">Indumentaria</option>
                                <option value="OTHER">Otros</option>
                            </select>
                            <div className="flex justify-end gap-2 mt-4">
                                <button className="px-4 py-2 rounded bg-gray-700" onClick={() => setShowEditModal(false)}>Cancelar</button>
                                <button className="px-4 py-2 rounded bg-brand-gold text-black" onClick={() => {
                                    if (!editingProduct) return;
                                    const updated = db.updateProduct(editingProduct.id, { name: editProductForm.name, price: Number(editProductForm.price), category: editProductForm.category, stock: Number(editProductForm.stock) });
                                    setInventory(db.getInventory());
                                    setToast({ message: `Producto "${updated?.name || editingProduct.name}" actualizado.`, type: 'success' });
                                    setShowEditModal(false);
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