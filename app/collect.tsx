import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

/* 📦 TIPOS DE DATOS */
type Product = {
  idProducto: number;
  name: string;
  unitPrice: number;
  unitValue: number;
};

type CollectOrder = {
  idOrden: number;
  company: number;
  date: number;
  phone: string;
  nameClient: string;
  address: string;
  total: number;
  subTotal: number;
  description: string;
  status: string;
  products: Product[];
};

export default function CollectScreen() {
  const [orders, setOrders] = useState<CollectOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);

  /* 🔄 CARGAR PEDIDOS */
  const fetchCollectOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('http://192.168.20.181:2909/orden/getOrdenCollect?company=1');
      const json = await response.json();

      if (json.code === '0000') {
        // Manejo defensivo: si devuelve un objeto único, lo convertimos en array
        let data = json.response;
        if (!Array.isArray(data)) {
          data = data ? [data] : [];
        }
        setOrders(data);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching collect orders:', error);
      Alert.alert('Error', 'No se pudieron cargar los pedidos por recoger.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCollectOrders();
    }, [fetchCollectOrders])
  );

  /* 🛠 UTILIDADES */
  const toggleExpand = (id: number) => {
    setExpandedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const formatCurrency = (amount: number) => amount.toLocaleString('es-CO');

  const formatDate = (dateInt: number) => {
    const str = dateInt.toString();
    if (str.length !== 8) return str;
    const year = str.substring(0, 4);
    const month = str.substring(4, 6);
    const day = str.substring(6, 8);
    return `${day}/${month}/${year}`;
  };

  const openWhatsApp = (phone: string) => {
    const url = `whatsapp://send?phone=57${phone}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) Linking.openURL(url);
      else Alert.alert('Error', 'WhatsApp no está instalado');
    });
  };

  /* ✅ MARCAR COMO RECOGIDO (Status: F) */
  const markAsCollected = (id: number) => {
    Alert.alert(
      "Confirmar Entrega",
      "¿Ya este pedido fue recojido?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, Recogido",
          onPress: async () => {
            setLoading(true);
            try {
              const response = await fetch('http://192.168.20.181:2909/orden/updateStatus', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  company: 1,
                  idOrden: id,
                  status: 'F' // Estado finalizado/recogido
                })
              });
              const json = await response.json();

              if (json.code === '0000' && json.response === true) {
                Alert.alert("Éxito", "Pedido marcado como recogido.");
                // Eliminar de la lista localmente
                setOrders(prev => prev.filter(o => o.idOrden !== id));
              } else {
                Alert.alert("Error", "No se pudo actualizar el estado.");
              }
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Fallo de conexión.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  /* 🎨 RENDERIZADO DE TARJETA */
  const renderItem = ({ item }: { item: CollectOrder }) => {
    const isExpanded = expandedIds.includes(item.idOrden);
    const debt = item.total - item.subTotal;
    const isPaid = debt <= 0;

    return (
      <View style={styles.card}>
        {/* CABECERA */}
        <View style={styles.cardHeader}>
          <View style={styles.badgeContainer}>
            <View style={styles.idBadge}>
              <Text style={styles.idText}>#{item.idOrden}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>POR RECOGER</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={styles.dateText}>{formatDate(item.date)}</Text>
            <TouchableOpacity onPress={() => markAsCollected(item.idOrden)}>
              <Ionicons name="checkmark-done-circle" size={30} color="#27ae60" />
            </TouchableOpacity>
          </View>
        </View>

        {/* INFO CLIENTE */}
        <View style={styles.infoSection}>
          <Text style={styles.clientName}>{item.nameClient}</Text>
          
          <View style={styles.row}>
            <Ionicons name="location-outline" size={16} color="#7f8c8d" />
            <Text style={styles.infoText}>{item.address}</Text>
          </View>

          <TouchableOpacity onPress={() => openWhatsApp(item.phone)} style={styles.row}>
            <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
            <Text style={[styles.infoText, { color: '#25D366', fontWeight: 'bold' }]}>
              {item.phone}
            </Text>
          </TouchableOpacity>

          {item.description ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteText}>📝 {item.description}</Text>
            </View>
          ) : null}
        </View>

        {/* PRODUCTOS */}
        <TouchableOpacity 
          style={styles.productsToggle} 
          onPress={() => toggleExpand(item.idOrden)}
          activeOpacity={0.7}
        >
          <Text style={styles.toggleText}>
            {isExpanded ? 'Ocultar Productos' : `Ver ${item.products.length} Productos`}
          </Text>
          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color="#8e44ad" />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.productList}>
            {item.products.map((prod, idx) => (
              <View key={idx} style={styles.productRow}>
                <Text style={styles.prodQty}>{prod.unitValue}x</Text>
                <Text style={styles.prodName}>{prod.name}</Text>
                <Text style={styles.prodPrice}>${formatCurrency(prod.unitPrice * prod.unitValue)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* FOOTER FINANCIERO */}
        <View style={styles.footer}>
          <View style={styles.financeItem}>
            <Text style={styles.financeLabel}>Total</Text>
            <Text style={styles.financeValue}>${formatCurrency(item.total)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.financeItem}>
            <Text style={styles.financeLabel}>Abonado</Text>
            <Text style={[styles.financeValue, { color: '#27ae60' }]}>${formatCurrency(item.subTotal)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.financeItem}>
            <Text style={styles.financeLabel}>Pendiente</Text>
            <Text style={[styles.financeValue, { color: isPaid ? '#27ae60' : '#e74c3c' }]}>
              {isPaid ? '¡Pagado!' : `$${formatCurrency(debt)}`}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8e44ad" />
        <Text style={styles.loadingText}>Buscando pedidos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.idOrden.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 15, paddingBottom: 30 }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="bag-check-outline" size={80} color="#dcdde1" />
            <Text style={styles.emptyText}>No hay pedidos por recoger</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  loadingText: { marginTop: 10, color: '#7f8c8d' },
  emptyText: { marginTop: 10, color: '#95a5a6', fontSize: 16 },
  
  /* TARJETA */
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 15,
    padding: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
    paddingBottom: 10,
  },
  badgeContainer: { flexDirection: 'row', gap: 8 },
  idBadge: { backgroundColor: '#2c3e50', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  idText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  statusBadge: { backgroundColor: '#8e44ad', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { color: '#fff', fontWeight: 'bold', fontSize: 10 },
  dateText: { color: '#7f8c8d', fontSize: 12, fontWeight: '600' },

  /* INFO */
  infoSection: { marginBottom: 10 },
  clientName: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  infoText: { color: '#57606f', fontSize: 14 },
  noteBox: { backgroundColor: '#fff9c4', padding: 8, borderRadius: 6, marginTop: 8 },
  noteText: { color: '#f39c12', fontSize: 12, fontStyle: 'italic' },

  /* PRODUCTOS */
  productsToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#f8eff9',
    borderRadius: 8,
    marginTop: 5,
  },
  toggleText: { color: '#8e44ad', fontWeight: 'bold', marginRight: 5, fontSize: 13 },
  productList: { backgroundColor: '#fafafa', padding: 10, borderRadius: 8, marginTop: 5 },
  productRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  prodQty: { fontWeight: 'bold', width: 30, color: '#8e44ad' },
  prodName: { flex: 1, color: '#2c3e50', fontSize: 13 },
  prodPrice: { fontWeight: 'bold', color: '#7f8c8d', fontSize: 13 },

  /* FOOTER */
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f2f6',
  },
  financeItem: { alignItems: 'center', flex: 1 },
  financeLabel: { fontSize: 10, color: '#a4b0be', textTransform: 'uppercase', fontWeight: 'bold' },
  financeValue: { fontSize: 15, fontWeight: 'bold', color: '#2c3e50', marginTop: 2 },
  divider: { width: 1, height: '80%', backgroundColor: '#dfe4ea' },
});