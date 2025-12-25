import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Stack } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useCart } from "../context/CartContext";

export default function CartScreen() {
  const { cart, removeFromCart, setQuantity, updatePrice } = useCart();

  /* 📅 FECHA */
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  /* 📱 CELULAR (solo números) */
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  /* 📝 DESCRIPCIÓN (Opcional) */
  const [description, setDescription] = useState("");
  const [showDescription, setShowDescription] = useState(false);

  /*  PAGO */
  const [payment, setPayment] = useState("");

  const handleSaveOrder = async () => {
    if (!phone.trim()) {
      Alert.alert("Atención", "El campo de celular es obligatorio.");
      return;
    }
    if (phone.length !== 10) {
      Alert.alert("Atención", "El celular debe tener exactamente 10 dígitos.");
      return;
    }
    if (!name.trim()) {
      Alert.alert("Atención", "El nombre es obligatorio.");
      return;
    }
    if (!address.trim()) {
      Alert.alert("Atención", "La dirección es obligatoria.");
      return;
    }

    // Formato fecha YYYYMMDD
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const dateInt = parseInt(`${yyyy}${mm}${dd}`, 10);

    const parsedPayment = parseFloat(payment);
    const abono = isNaN(parsedPayment) ? 0 : parsedPayment;

    const payload = {
      company: 1,
      date: dateInt,
      phone: phone,
      name: name,
      address: address,
      total: total,
      subTotal: abono,
      description: description + (abono > 0 ? ` | Abono: $${payment}` : ""),
      products: cart.map((item) => ({
        idProducto: item.id,
        name: item.name,
        unitValue: item.quantity,
        unitPrice: item.price,
      })),
    };

    try {
      const response = await fetch("http://192.168.0.18:2909/orden/createOrden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      
      if (response.ok) {
        Alert.alert("Éxito", "Pedido guardado correctamente.");
      } else {
        Alert.alert("Error", "No se pudo guardar el pedido.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Fallo de conexión con el servidor.");
    }
  };

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const debt = Math.max(0, total - (parseFloat(payment) || 0));

  const handleQuickPayment = (factor: number) => {
    if (factor === 0) setPayment("");
    else setPayment((total * factor).toFixed(2));
  };

  const renderItem = ({ item }: any) => {
    const max = item.disponibilidad ?? 0; // ✅ fallback seguro

    const onChangeQty = (text: string) => {
      let value = parseInt(text || "0", 10);

      if (value > max) value = max;
      if (value < 1) value = 1;

      setQuantity(item.id, value);
    };

    const onChangePrice = (text: string) => {
      const value = parseFloat(text || "0");
      if (!isNaN(value) && value > 0) {
        updatePrice(item.id, value);
      }
    };

    return (
      <View style={styles.cartItem}>
        <Image source={{ uri: item.image }} style={styles.cartItemImage} />

        <View style={{ flex: 1 }}>
          <Text style={styles.cartItemName}>{item.name}</Text>

          {/* ✅ DISPONIBILIDAD VISIBLE */}
          <Text style={styles.stockText}>
            Disponibilidad: Máx. {max}
          </Text>

          <View style={styles.row}>
            <TextInput
              style={styles.qtyInput}
              keyboardType="number-pad"
              value={item.quantity.toString()}
              onChangeText={onChangeQty}
            />

            <TextInput
              style={styles.priceInput}
              keyboardType="decimal-pad"
              value={item.price.toString()}
              onChangeText={onChangePrice}
            />

            <Text style={styles.subtotal}>
              ${(item.price * item.quantity).toFixed(2)}
            </Text>

            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => removeFromCart(item.id)}
            >
              <Text style={styles.removeText}>Quitar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity style={styles.headerSaveBtn} onPress={handleSaveOrder}>
              <Ionicons name="save" size={28} color="#27ae60" />
            </TouchableOpacity>
          ),
        }}
      />
    <FlatList
      data={cart}
      keyExtractor={item => item.id.toString()}
      renderItem={renderItem}
      contentContainerStyle={styles.container}
      ListHeaderComponent={
        <>
          <Text style={styles.title}>Detalles del Pedido</Text>

          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowPicker(true)}
          >
            <Text>Fecha: {date.toLocaleDateString()}</Text>
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker
              value={date}
              mode="date"
              minimumDate={new Date()}
              onChange={(e, selectedDate) => {
                setShowPicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}

          {/* 📱 SOLO NÚMEROS */}
          <TextInput
            placeholder="Celular"
            style={styles.input}
            keyboardType="number-pad"
            maxLength={10}
            value={phone}
            onChangeText={(text) =>
              setPhone(text.replace(/[^0-9]/g, ""))
            }
          />

          <TextInput
            placeholder="Nombre"
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            placeholder="Dirección"
            style={styles.input}
            value={address}
            onChangeText={setAddress}
          />

          {/* 📝 DESCRIPCIÓN OPCIONAL */}
          <TouchableOpacity
            onPress={() => setShowDescription(!showDescription)}
            style={styles.descToggle}
          >
            <Text style={styles.descToggleText}>
              {showDescription ? "− Ocultar nota" : "+ Agregar nota / descripción"}
            </Text>
          </TouchableOpacity>

          {showDescription && (
            <TextInput
              placeholder="Escribe aquí detalles adicionales..."
              style={[styles.input, styles.textArea]}
              multiline
              value={description}
              onChangeText={setDescription}
            />
          )}

          {/* � SECCIÓN DE PAGO */}
          <View style={styles.paymentContainer}>
            <View style={styles.paymentHeader}>
              <Text style={styles.paymentTitle}>Abono / Pago</Text>
              <View style={styles.quickActions}>
                <TouchableOpacity onPress={() => handleQuickPayment(0)}><Text style={styles.quickActionText}>0%</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => handleQuickPayment(0.5)}><Text style={styles.quickActionText}>50%</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => handleQuickPayment(1)}><Text style={styles.quickActionText}>Total</Text></TouchableOpacity>
              </View>
            </View>

            <View style={styles.paymentRow}>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.paymentInput}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  value={payment}
                  onChangeText={setPayment}
                />
              </View>
              <View style={styles.debtContainer}>
                <Text style={styles.debtLabel}>Pendiente</Text>
                <Text style={[styles.debtValue, { color: debt > 0 ? '#e74c3c' : '#27ae60' }]}>
                  ${debt.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.productsHeader}>
            <Text style={styles.productsTitle}>Productos</Text>
            <View style={styles.totalBadge}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
            </View>
          </View>
        </>
      }
      ListFooterComponent={null}
    />
    </>
  );
}

/* 🎨 ESTILOS */
const styles = StyleSheet.create({
  container: {
    padding: 15,
    backgroundColor: "#ecf0f1",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 10,
  },
  cartItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  cartItemImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginRight: 10,
  },
  cartItemName: {
    fontWeight: "bold",
  },
  stockText: {
    fontSize: 12,
    color: "#555",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  qtyInput: {
    width: 45,
    borderWidth: 1,
    borderColor: "#ccc",
    textAlign: "center",
    padding: 4,
  },
  priceInput: {
    width: 70,
    borderWidth: 1,
    borderColor: "#ccc",
    textAlign: "center",
    padding: 4,
  },
  subtotal: {
    fontWeight: "bold",
  },
  removeBtn: {
    backgroundColor: "#e74c3c",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: "auto",
  },
  removeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  input: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  descToggle: {
    marginBottom: 10,
  },
  descToggleText: {
    color: "#3498db",
    fontWeight: "bold",
  },
  productsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  productsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  totalBadge: {
    backgroundColor: "#27ae60",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  totalLabel: {
    color: "#fff",
    fontSize: 12,
    marginRight: 4,
  },
  totalValue: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  headerSaveBtn: {
    marginRight: 10,
    padding: 5,
  },
  paymentContainer: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#34495e",
  },
  quickActions: {
    flexDirection: 'row',
    gap: 15,
  },
  quickActionText: {
    color: '#3498db',
    fontWeight: 'bold',
    fontSize: 13,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#bdc3c7",
    width: '45%',
    paddingBottom: 2,
  },
  currencySymbol: {
    fontSize: 18,
    color: '#7f8c8d',
    marginRight: 5,
  },
  paymentInput: {
    fontSize: 18,
    flex: 1,
    color: '#2c3e50',
    padding: 0,
  },
  debtContainer: {
    alignItems: 'flex-end',
  },
  debtLabel: {
    fontSize: 11,
    color: '#95a5a6',
    marginBottom: 2,
  },
  debtValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
});
