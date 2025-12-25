import { Stack, router } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { CartProvider, useCart } from '../context/CartContext';

/* 🔴 BOTÓN DEL CARRITO EN EL HEADER */
function CartHeaderButton() {
  const { cart } = useCart();

  if (cart.length === 0) {
    return (
      <TouchableOpacity
        onPress={() => router.push('/cart')}
        style={{ marginRight: 20 }}
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
            top: -8,
            right: -10,
            backgroundColor: 'red',
            borderRadius: 12,
            minWidth: 22,
            height: 22,
            paddingHorizontal: 5,
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 6,
          }}
        >
          <Text
            style={{
              color: 'white',
              fontSize: 12,
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

export default function RootLayout() {
  return (
    <CartProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#2c3e50' },
          headerTintColor: '#ecf0f1',
          headerTitleAlign: 'left', // 👈 título a la izquierda
          headerRight: () => <CartHeaderButton />, // 👈 carrito arriba
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
