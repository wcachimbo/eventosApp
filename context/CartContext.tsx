import React, { createContext, useContext, useState } from "react";

/* =====================
   MODELO
===================== */
export type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  disponibilidad: number; // 🔥 valor real del backend
};

/* =====================
   METADATA DE EDICIÓN
===================== */
export type OrderMetadata = {
  idOrden?: number;
  date?: number;
  phone: string;
  name: string;
  address: string;
  subTotal: number;
  description: string;
  isEditing: boolean;
};

/* =====================
   CONTEXTO
===================== */
type CartContextType = {
  cart: CartItem[];
  addToCart: (item: any) => void;
  removeFromCart: (id: number) => void;
  setQuantity: (id: number, quantity: number) => void;
  updatePrice: (id: number, price: number) => void;
  clearCart: () => void;
  startEditing: (items: CartItem[], metadata: OrderMetadata) => void;
  updateMetadata: (metadata: Partial<OrderMetadata>) => void;
  orderMetadata: OrderMetadata | null;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

/* =====================
   PROVIDER
===================== */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderMetadata, setOrderMetadata] = useState<OrderMetadata | null>(null);

  /* ➕ AGREGAR AL CARRITO */
  const addToCart = (item: any) => {
    // 🔥 AJUSTA AQUÍ EL NOMBRE REAL QUE VIENE DEL SERVICIO
    const disponibilidad =
      item.disponibilidad ??
      item.available_quantity ??
      item.disponible_quantity ??
      item.stock ??
      0;

    setCart(prev => {
      const exists = prev.find(p => p.id === item.id);

      if (exists) {
        if (exists.quantity >= exists.disponibilidad) return prev;

        return prev.map(p =>
          p.id === item.id
            ? { ...p, quantity: p.quantity + 1 }
            : p
        );
      }

      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          image: item.image,
          disponibilidad, // ✅ GUARDADA CORRECTAMENTE
          quantity: 1,
        },
      ];
    });
  };

  /* ❌ QUITAR */
  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  /* 🔢 CANTIDAD */
  const setQuantity = (id: number, quantity: number) => {
    setCart(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        if (quantity < 1) return item;
        if (quantity > item.disponibilidad) return item;
        return { ...item, quantity };
      })
    );
  };

  /* 💲 PRECIO */
  const updatePrice = (id: number, price: number) => {
    setCart(prev =>
      prev.map(item =>
        item.id === id && price > 0
          ? { ...item, price }
          : item
      )
    );
  };

  /* 🧹 LIMPIAR CARRITO */
  const clearCart = () => {
    setCart([]);
    setOrderMetadata(null); // Limpiamos también la metadata
  };

  /* 🔄 INICIAR EDICIÓN */
  const startEditing = (items: CartItem[], metadata: OrderMetadata) => {
    setCart(items);
    setOrderMetadata(metadata);
  };

  /* 📝 ACTUALIZAR METADATA (mientras se edita) */
  const updateMetadata = (data: Partial<OrderMetadata>) => {
    setOrderMetadata(prev => prev ? { ...prev, ...data } : null);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        setQuantity,
        updatePrice,
        clearCart,
        startEditing,
        updateMetadata,
        orderMetadata,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

/* =====================
   HOOK
===================== */
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart debe usarse dentro de CartProvider");
  }
  return context;
}
