import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Stack, router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useCart } from "../context/CartContext";

export default function CartScreen() {
  const { 
    cart, 
    removeFromCart, 
    setQuantity, 
    updatePrice, 
    clearCart, 
    orderMetadata, 
    updateMetadata 
  } = useCart();
  
  const isEditing = orderMetadata?.isEditing || false;

  /* 🔄 REDIRECCIONAR SI SE VACÍA EL CARRITO */
  useEffect(() => {
    if (cart.length === 0) {
      router.navigate("/");
    }
  }, [cart]);

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

  /* 🟢 MODAL DE ÉXITO */
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [orderResponse, setOrderResponse] = useState<any>(null);

  /* ✏️ EFECTO PARA CARGAR DATOS DESDE CONTEXTO */
  useEffect(() => {
    if (isEditing && orderMetadata) {
      if (orderMetadata.phone) setPhone(orderMetadata.phone);
      if (orderMetadata.name) setName(orderMetadata.name);
      if (orderMetadata.address) setAddress(orderMetadata.address);
      if (orderMetadata.subTotal) setPayment(orderMetadata.subTotal.toString());
      
      // Parsear fecha YYYYMMDD
      if (orderMetadata.date) {
        const dStr = orderMetadata.date.toString();
        if (dStr.length === 8) {
           const year = parseInt(dStr.substring(0, 4));
           const month = parseInt(dStr.substring(4, 6)) - 1;
           const day = parseInt(dStr.substring(6, 8));
           setDate(new Date(year, month, day));
        }
      }
      
      // Parsear descripción (limpiar el texto automático de abono anterior)
      if (orderMetadata.description) {
         let desc = orderMetadata.description;
         if (desc.includes(' | Abono:')) desc = desc.split(' | Abono:')[0];
         setDescription(desc);
         if (desc) setShowDescription(true);
      }
    }
  }, [isEditing, orderMetadata?.idOrden]); // Dependencia clave: idOrden

  /* 💾 GUARDAR ESTADO TEMPORAL AL SALIR (Para agregar productos) */
  const handleAddMoreProducts = () => {
    if (isEditing) {
      updateMetadata({
        phone,
        name,
        address,
        description,
        // No guardamos fecha/pago aquí para simplificar, pero se podría
      });
    }
    router.navigate('/'); // Ir a lista de productos
  };

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
      idOrden: isEditing ? orderMetadata?.idOrden : undefined,
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

    const url = isEditing 
      ? "http://192.168.20.181:2909/orden/updateOrden" 
      : "http://192.168.20.181:2909/orden/createOrden";

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      
      if (response.ok) {
        setOrderResponse(json);
        setSuccessModalVisible(true);
      } else {
        Alert.alert("Error", `No se pudo ${isEditing ? 'actualizar' : 'guardar'} el pedido.`);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Fallo de conexión con el servidor.");
    }
  };

  const closeSuccessModal = () => {
    setSuccessModalVisible(false);
    setOrderResponse(null);
    clearCart();
    if (isEditing) {
      router.navigate("/orders"); // Si editamos, volver a pedidos
    } else {
      router.navigate("/"); // Si es nuevo, volver a productos
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
          title: isEditing ? "Actualizar Pedido" : "Carrito",
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
          <Text style={styles.title}>{isEditing ? "Editar Detalles" : "Detalles del Pedido"}</Text>

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

          {/* ➕ BOTÓN AGREGAR MÁS PRODUCTOS */}
          <TouchableOpacity style={styles.addMoreBtn} onPress={handleAddMoreProducts}>
            <Ionicons name="add-circle-outline" size={24} color="#fff" />
            <Text style={styles.addMoreText}>Agregar más productos</Text>
          </TouchableOpacity>

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

    {/* 🟢 MODAL DE ÉXITO */}
    <Modal
      animationType="fade"
      transparent={true}
      visible={successModalVisible}
      onRequestClose={closeSuccessModal}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Ionicons name="checkmark-circle" size={80} color="#27ae60" />
          <Text style={styles.modalTitle}>{isEditing ? "¡Actualizado!" : "¡Pedido Exitoso!"}</Text>
          <Text style={styles.modalText}>El pedido se ha {isEditing ? "actualizado" : "registrado"} correctamente.</Text>

          {orderResponse && (
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>ID Pedido:</Text>
              <Text style={styles.infoValue}>#{orderResponse?.id || orderResponse?.idOrden || orderResponse?.response?.id || orderResponse?.response?.idOrden || "---"}</Text>
              <Text style={styles.infoLabel}>Cliente:</Text>
              <Text style={styles.infoValue}>{orderResponse.name || name}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.modalBtn} onPress={closeSuccessModal}>
            <Text style={styles.modalBtnText}>{isEditing ? "Volver a Pedidos" : "Volver a Productos"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
  addMoreBtn: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
  },
  addMoreText: { color: '#fff', fontWeight: 'bold', marginLeft: 8, fontSize: 16 },
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
  /* MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    width: "85%",
    padding: 25,
    borderRadius: 20,
    alignItems: "center",
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    marginTop: 10,
    marginBottom: 5,
  },
  modalText: {
    fontSize: 16,
    color: "#7f8c8d",
    textAlign: "center",
    marginBottom: 20,
  },
  infoBox: {
    width: "100%",
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#ecf0f1",
  },
  infoLabel: {
    fontSize: 14,
    color: "#95a5a6",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 10,
  },
  modalBtn: {
    backgroundColor: "#27ae60",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 30,
    width: "100%",
    alignItems: "center",
    shadowColor: "#27ae60",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  modalBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
