import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

/* 📦 TIPOS DE DATOS */
type ProductOrder = {
  idProducto: number;
  name: string;
  unitPrice: number;
  unitValue: number;
};

type Order = {
  idOrden: number;
  company: number;
  date: number; // Formato YYYYMMDD
  phone: string;
  name?: string; // A veces no viene en el JSON, lo manejamos opcional
  address: string;
  total: number;
  subTotal: number; // Esto parece ser el ABONO según el JSON
  description: string;
  status: string;
  products: ProductOrder[];
};

type SectionData = {
  title: string;
  data: Order[];
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

export default function OrdersScreen() {
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<number[]>([]);

  /* 🔄 CARGAR PEDIDOS */
  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Usamos la IP local consistente con los otros archivos
      const response = await fetch('http://192.168.0.18:2909/orden/getOrdenPending?company=1');
      const json = await response.json();

      if (json.code === '0000') {
        const { today, tomorrow, orden } = json.response;

        const newSections: SectionData[] = [
          { title: '🔥 Para Hoy', data: today || [], icon: 'flame', color: '#e74c3c' },
          { title: '🚀 Para Mañana', data: tomorrow || [], icon: 'rocket', color: '#3498db' },
          { title: '📅 Próximos', data: orden || [], icon: 'calendar', color: '#f1c40f' },
        ].filter(sec => sec.data.length > 0); // Solo mostrar secciones con datos

        setSections(newSections);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'No se pudieron cargar los pedidos.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );

  /* 🛠 UTILIDADES */
  const toggleExpand = (id: number) => {
    setExpandedOrders(prev =>
      prev.includes(id) ? prev.filter(oId => oId !== id) : [...prev, id]
    );
  };

  const formatIntDate = (dateInt: number) => {
    const str = dateInt.toString();
    if (str.length !== 8) return str;
    const year = str.substring(0, 4);
    const month = str.substring(4, 6);
    const day = str.substring(6, 8);
    return `${day}/${month}/${year}`;
  };

  const openWhatsApp = (phone: string) => {
    const url = `whatsapp://send?phone=57${phone}`; // Asumiendo prefijo +57 Colombia por el contexto
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'WhatsApp no está instalado');
      }
    });
  };

  /* ⚡ ACCIONES DE PEDIDO */
  const handleOrderAction = (action: 'entregar' | 'actualizar' | 'cancelar', order: Order) => {
    if (action === 'actualizar') {
      Alert.alert('Actualizar', `Funcionalidad para editar el pedido #${order.idOrden} (Próximamente)`);
      return;
    }

    const title = action === 'entregar' ? 'Entregar Pedido' : 'Cancelar Pedido';
    const message = `¿Estás seguro de que deseas ${action} el pedido #${order.idOrden}?`;

    Alert.alert(title, message, [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Confirmar',
        style: action === 'cancelar' ? 'destructive' : 'default',
        onPress: () => executeAction(action, order.idOrden),
      },
    ]);
  };

  const executeAction = async (action: string, id: number) => {
    setLoading(true);
    // Simulación de API - Aquí irían los fetch correspondientes
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Éxito', `El pedido #${id} ha sido procesado (${action}).`);
      fetchOrders(); // Recargar la lista
    }, 1000);
  };

  /* 🎨 RENDERIZADO */
  const renderOrder = ({ item }: { item: Order }) => {
    const isExpanded = expandedOrders.includes(item.idOrden);
    const debt = item.total - item.subTotal; // Total - Abono
    const isPaid = debt <= 0;

    return (
      <View style={styles.card}>
        {/* CABECERA DE LA TARJETA */}
        <View style={styles.cardHeader}>
          <View style={styles.idBadge}>
            <Text style={styles.idText}>#{item.idOrden}</Text>
          </View>
          <Text style={styles.dateText}>{formatIntDate(item.date)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: isPaid ? '#27ae60' : '#e67e22' }]}>
            <Text style={styles.statusText}>{isPaid ? 'PAGADO' : 'PENDIENTE'}</Text>
          </View>
        </View>

        {/* INFORMACIÓN PRINCIPAL */}
        <View style={styles.infoContainer}>
          <View style={styles.row}>
            <Ionicons name="location-sharp" size={18} color="#7f8c8d" />
            <Text style={styles.infoText}>{item.address}</Text>
          </View>
          
          <TouchableOpacity onPress={() => openWhatsApp(item.phone)} style={styles.row}>
            <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
            <Text style={[styles.infoText, { color: '#25D366', fontWeight: 'bold' }]}>
              {item.phone}
            </Text>
          </TouchableOpacity>

          {item.description ? (
            <View style={styles.noteContainer}>
              <Text style={styles.noteText}>📝 {item.description}</Text>
            </View>
          ) : null}
        </View>

        {/* PRODUCTOS (ACORDEÓN) */}
        <TouchableOpacity 
          style={styles.productsToggle} 
          onPress={() => toggleExpand(item.idOrden)}
          activeOpacity={0.7}
        >
          <Text style={styles.productsToggleText}>
            {isExpanded ? 'Ocultar Productos' : `Ver ${item.products.length} Productos`}
          </Text>
          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#3498db" />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.productsList}>
            {item.products.map((prod, index) => (
              <View key={index} style={styles.productItem}>
                <Text style={styles.prodQty}>{prod.unitValue}x</Text>
                <Text style={styles.prodName}>{prod.name}</Text>
                <Text style={styles.prodPrice}>${(prod.unitPrice * prod.unitValue).toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}

        {/* FOOTER FINANCIERO */}
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.footerLabel}>Total</Text>
            <Text style={styles.totalAmount}>${item.total.toLocaleString()}</Text>
          </View>
          <View style={styles.divider} />
          <View>
            <Text style={styles.footerLabel}>Abonado</Text>
            <Text style={styles.paidAmount}>${item.subTotal.toLocaleString()}</Text>
          </View>
          <View style={styles.divider} />
          <View>
            <Text style={styles.footerLabel}>Resta</Text>
            <Text style={[styles.debtAmount, { color: debt > 0 ? '#e74c3c' : '#95a5a6' }]}>
              ${debt.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* BOTONES DE ACCIÓN */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#27ae60' }]}
            onPress={() => handleOrderAction('entregar', item)}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.actionText}>Entregar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#f39c12' }]}
            onPress={() => handleOrderAction('actualizar', item)}
          >
            <Ionicons name="create" size={18} color="#fff" />
            <Text style={styles.actionText}>Actualizar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#c0392b' }]}
            onPress={() => handleOrderAction('cancelar', item)}
          >
            <Ionicons name="close-circle" size={18} color="#fff" />
            <Text style={styles.actionText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={{ marginTop: 10, color: '#7f8c8d' }}>Cargando pedidos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.idOrden.toString()}
        renderItem={renderOrder}
        renderSectionHeader={({ section: { title, icon, color } }) => (
          <View style={styles.sectionHeader}>
            <Ionicons name={icon} size={24} color={color} style={{ marginRight: 8 }} />
            <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="file-tray-outline" size={60} color="#bdc3c7" />
            <Text style={{ color: '#95a5a6', marginTop: 10 }}>No hay pedidos pendientes</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ecf0f1', paddingHorizontal: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  /* SECCIONES */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  sectionTitle: { fontSize: 20, fontWeight: 'bold' },

  /* TARJETA */
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    padding: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },
  idBadge: { backgroundColor: '#34495e', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  idText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  dateText: { color: '#7f8c8d', fontSize: 14 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  /* INFO */
  infoContainer: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  infoText: { fontSize: 16, color: '#2c3e50' },
  noteContainer: { backgroundColor: '#fff3cd', padding: 8, borderRadius: 6, marginTop: 5 },
  noteText: { color: '#856404', fontStyle: 'italic', fontSize: 13 },

  /* PRODUCTOS */
  productsToggle: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 8, backgroundColor: '#f9f9f9', borderRadius: 8 },
  productsToggleText: { color: '#3498db', fontWeight: 'bold', marginRight: 5 },
  productsList: { marginTop: 5, backgroundColor: '#f8f9fa', padding: 10, borderRadius: 8 },
  productItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  prodQty: { fontWeight: 'bold', width: 30, color: '#2c3e50' },
  prodName: { flex: 1, color: '#34495e' },
  prodPrice: { fontWeight: 'bold', color: '#7f8c8d' },

  /* FOOTER */
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  footerLabel: { fontSize: 10, color: '#95a5a6', textTransform: 'uppercase' },
  totalAmount: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50' },
  paidAmount: { fontSize: 16, fontWeight: 'bold', color: '#27ae60' },
  debtAmount: { fontSize: 16, fontWeight: 'bold' },
  divider: { width: 1, backgroundColor: '#eee', height: '100%' },

  /* ACCIONES */
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 5,
  },
});
