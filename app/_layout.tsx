import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { CartProvider, useCart } from '../context/CartContext';

/* 🔴 BOTÓN DEL CARRITO EN EL HEADER */
function CartHeaderButton() {
  const { cart } = useCart();

  if (cart.length === 0) {
    return (
      <TouchableOpacity
        onPress={() => Alert.alert("Carrito Vacío", "Debes seleccionar productos para entrar al carrito.")}
        style={{ marginRight: 20, opacity: 0.5 }}
      >
        <Text style={{ fontSize: 22 }}>🛒</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={() => router.push('/cart')}
      style={{ marginRight: 20 }}
    >
      <View style={{ padding: 6 }}>
        <Text style={{ fontSize: 22 }}>🛒</Text>

        {/* 🔴 GLOBITO ROJO */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            backgroundColor: 'red',
            borderRadius: 9,
            minWidth: 18,
            height: 18,
            paddingHorizontal: 4,
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 6,
            zIndex: 10,
          }}
        >
          <Text
            style={{
              color: 'white',
              fontSize: 10,
              fontWeight: 'bold',
            }}
          >
            {cart.length}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function HeaderRight() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <CartHeaderButton />
      <TouchableOpacity onPress={() => router.push('/orders')} style={{ marginRight: 15 }}>
        <Ionicons name="receipt-outline" size={26} color="#ecf0f1" />
      </TouchableOpacity>
    </View>
  );
}

export default function RootLayout() {
  return (
    <CartProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#2c3e50' },
          headerTintColor: '#ecf0f1',
          headerTitleAlign: 'left', // 👈 título a la izquierda
          headerRight: () => <HeaderRight />, // 👈 carrito y pedidos arriba
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: 'Productos' }}
        />
        <Stack.Screen
          name="cart"
          options={{ title: 'Carrito' }}
        />
        <Stack.Screen
          name="orders"
          options={{ title: 'Pedidos' }}
        />
      </Stack>
    </CartProvider>
  );
}
