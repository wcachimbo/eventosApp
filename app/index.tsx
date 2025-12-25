import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useCart } from '../context/CartContext';


type Product = {
  id: number;
  name: string;
  price: number;
  disponibilidad: number;
  image: string;
};

export default function ProductListScreen() {
  const { addToCart, cart, removeFromCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(
          'https://evento-wt72.onrender.com/products/getProduct?company=1'
        );
        const json = await response.json();

        if (json.code === '0000') {
          const mappedProducts = json.response.map((item: any) => ({
            id: item.id_product,
            name: item.nombre,
            price: item.price,
            disponibilidad: item.available,
            image: `data:image/jpeg;base64,${item.imagen}`,
          }));

          setProducts(mappedProducts);
        }
      } catch (error) {
        console.error('Error al cargar productos:', error);
      }
    };

    fetchProducts();
  }, []);

  const renderItem = ({ item }: { item: Product }) => {
    const isInCart = cart.some(cartItem => cartItem.id === item.id);

    return (
      <View style={styles.productContainer}>
        <Image source={{ uri: item.image }} style={styles.productImage} />

        <Text style={styles.productName}>{item.name}</Text>

        <View style={styles.priceQuantityRow}>
          <Text style={styles.priceText}>
            Valor unitario: ${item.price.toFixed(2)}
          </Text>

          <View style={styles.quantityButtonRow}>
            <Text style={styles.quantityText}>
              Disponibles: {item.disponibilidad}
            </Text>

            <TouchableOpacity
              style={[
                styles.addButton,
                isInCart && styles.removeButton,
              ]}
              onPress={() =>
                isInCart
                  ? removeFromCart(item.id)
                  : addToCart(item)
              }
            >
              <Text style={styles.addButtonText}>
                {isInCart ? 'X' : '+'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        numColumns={2}
      />

      {/* BOTÓN FLOTANTE AL CARRITO */}

    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#ecf0f1',
  },
  productContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    margin: 5,
    flex: 1,
    alignItems: 'center',
    elevation: 5,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  priceQuantityRow: {
    width: '100%',
  },
  priceText: {
    marginBottom: 5,
  },
  quantityButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityText: {
    flex: 1,
  },
  addButton: {
    backgroundColor: '#27ae60',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    backgroundColor: '#e74c3c',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
  }
 
});
