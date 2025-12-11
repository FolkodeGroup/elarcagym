import React, { useState } from 'react';
import { db } from '../services/db';
import { Product } from '../types';
import { ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react';

const Admin: React.FC = () => {
  const [inventory] = useState<Product[]>(db.getInventory());
  const [cart, setCart] = useState<{product: Product, qty: number}[]>([]);

  const addToCart = (product: Product) => {
    setCart(prev => {
        const existing = prev.find(p => p.product.id === product.id);
        if(existing) {
            return prev.map(p => p.product.id === product.id ? {...p, qty: p.qty + 1} : p);
        }
        return [...prev, { product, qty: 1 }];
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
      alert("Venta registrada con éxito.");
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
      {/* Product Grid */}
      <div className="lg:col-span-2 overflow-auto pr-2">
        <h2 className="text-2xl font-display font-bold text-white mb-6">Productos</h2>
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
                         <div>
                             <p className="text-white text-sm font-bold">{item.product.name}</p>
                             <p className="text-brand-gold text-xs">${item.product.price} x {item.qty}</p>
                         </div>
                         <button onClick={() => removeFromCart(item.product.id)} className="text-red-500 hover:text-red-400">
                             <Trash2 size={18} />
                         </button>
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
    </div>
  );
};

export default Admin;