import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { API_URL } from "../constants/Config";
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
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/products/getProduct?company=1`);
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
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    }, [])
  );

  /* 💰 FORMATO MONEDA */
  const formatCurrency = (amount: number) => amount.toLocaleString('es-CO');

  const renderItem = ({ item }: { item: Product }) => {
    const isInCart = cart.some(cartItem => cartItem.id === item.id);

    return (
      <View style={styles.productContainer}>
        <Image source={{ uri: item.image }} style={styles.productImage} />

        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>

        <View style={styles.cardFooter}>
          <View style={styles.infoColumn}>
            <Text style={styles.priceText}>${formatCurrency(item.price)}</Text>
            <Text style={styles.stockText}>Disp: {item.disponibilidad}</Text>
          </View>

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
            <Ionicons name={isInCart ? "trash" : "add"} size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Cargando productos...</Text>
      </View>
    );
  }

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
    height: 40, // Altura fija para alinear tarjetas
    textAlignVertical: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 5,
  },
  infoColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  stockText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  addButton: {
    backgroundColor: '#3498db',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  removeButton: {
    backgroundColor: '#e74c3c',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ecf0f1',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
  },
});
