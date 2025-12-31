import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import React, { useCallback, useLayoutEffect, useState } from 'react';
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
import { useCart } from '../context/CartContext';

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
  const navigation = useNavigation();
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<number[]>([]);
  const { startEditing } = useCart();

  /* 🏠 BOTÓN HOME EN HEADER */
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.navigate('/')} style={{ marginRight: 15 }}>
           <Ionicons name="home" size={24} color="#ecf0f1" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  /* 🔄 CARGAR PEDIDOS */
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      // Usamos la IP local consistente con los otros archivos
      // Agregamos timestamp para evitar caché y forzar datos frescos
      const response = await fetch(`http://192.168.0.18:2909/orden/getOrdenPending?company=1&_t=${Date.now()}`);
      const json = await response.json();

      if (json.code === '0000') {
        const { today, tomorrow, orden } = json.response;

        const mapOrder = (o: any) => ({
          ...o,
          name: o.nameClient || o.name,
        });

        const newSections: SectionData[] = [
          { title: '🔥 Para Hoy', data: (today || []).map(mapOrder), icon: 'flame', color: '#e74c3c' },
          { title: '🚀 Para Mañana', data: (tomorrow || []).map(mapOrder), icon: 'rocket', color: '#3498db' },
          { title: '📅 Próximos', data: (orden || []).map(mapOrder), icon: 'calendar', color: '#f1c40f' },
        ].filter(sec => sec.data.length > 0); // Solo mostrar secciones con datos

        setSections(newSections);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'No se pudieron cargar los pedidos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
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

  /* 💰 FORMATO MONEDA */
  const formatCurrency = (amount: number) => amount.toLocaleString('es-CO');

  /* ⚡ ACCIONES DE PEDIDO */
  const handleOrderAction = (action: 'entregar' | 'actualizar' | 'cancelar', order: Order) => {
    if (action === 'actualizar') {
      Alert.alert(
        'Editar Pedido',
        'Esto cargará el pedido en el carrito para su edición. Si tienes productos en el carrito, serán reemplazados. ¿Continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Editar', 
            onPress: async () => {
              setLoading(true);
              try {
                // 1. Obtener catálogo para sacar las IMÁGENES
                const prodResponse = await fetch('http://192.168.0.18:2909/products/getProduct?company=1');
                const prodJson = await prodResponse.json();
                let imageMap: Record<number, string> = {};

                if (prodJson.code === '0000') {
                  prodJson.response.forEach((p: any) => {
                    imageMap[p.id_product] = `data:image/jpeg;base64,${p.imagen}`;
                  });
                }

                // 2. Mapear productos con imagen real
                const cartItems = order.products.map(p => ({
                  id: p.idProducto,
                  name: p.name,
                  price: p.unitPrice,
                  quantity: p.unitValue,
                  image: imageMap[p.idProducto] || 'https://via.placeholder.com/150', // Fallback si no hay imagen
                  disponibilidad: 9999
                }));

                // 3a. Preparar productos originales para comparación (formato del servicio)
                const originalProducts = order.products.map(p => ({
                  productId: p.idProducto,
                  name: p.name,
                  quantity: p.unitValue,
                  price: p.unitPrice
                }));

                // 3. Preparar Metadata
                const metadata = {
                  orderId: order.idOrden,
                  idOrden: order.idOrden,
                  date: order.date,
                  phone: order.phone,
                  name: order.name || '', // Aseguramos que el nombre viaje
                  address: order.address,
                  subTotal: order.subTotal,
                  description: order.description,
                  isEditing: true,
                  originalProducts // Guardamos la referencia original
                };

                // 4. Iniciar edición y navegar
                startEditing(cartItems, metadata);
                router.push('/cart');
              } catch (error) {
                console.error("Error preparando edición:", error);
                Alert.alert("Error", "No se pudieron cargar los datos del pedido.");
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
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

    const statusMap: Record<string, string> = {
      'entregar': 'E',
      'cancelar': 'X'
    };

    const newStatus = statusMap[action];

    try {
      const response = await fetch('http://192.168.0.18:2909/orden/updateStatus', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: 1,
          idOrden: id,
          status: newStatus
        })
      });
      const json = await response.json();

      if (json.code === '0000' && json.response === true) {
        /* ⚡ ACTUALIZACIÓN OPTIMISTA: Eliminar visualmente el pedido de inmediato */
        setSections(prev => 
          prev.map(section => ({
            ...section,
            data: section.data.filter(order => order.idOrden !== id)
          })).filter(section => section.data.length > 0)
        );

        Alert.alert(
          'Éxito',
          `El pedido #${id} ha sido actualizado correctamente.`,
          [
            { text: 'OK', onPress: () => setTimeout(() => fetchOrders(), 500) }
          ]
        );
      } else {
        Alert.alert('Error', 'No se pudo actualizar el estado del pedido.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Fallo de conexión al actualizar estado.');
    } finally {
      setLoading(false);
    }
  };

  /* 🎨 RENDERIZADO */
  const renderOrder = ({ item }: { item: Order }) => {
    const isExpanded = expandedOrders.includes(item.idOrden);
    const debt = item.total - item.subTotal; // Total - Abono

    /* 🏷️ MAPEO DE ESTADOS */
    const getStatusInfo = (status: string) => {
      switch (status) {
        case 'P': return { text: 'PENDIENTE', color: '#e67e22' };   // Naranja
        case 'C': return { text: 'CONFIRMADO', color: '#3498db' };  // Azul
        case 'G': return { text: 'PAGADO', color: '#27ae60' };      // Verde
        case 'E': return { text: 'ENTREGADO', color: '#2c3e50' };   // Oscuro
        case 'X': return { text: 'CANCELADO', color: '#c0392b' };   // Rojo
        default: return { text: status || 'PENDIENTE', color: '#95a5a6' };
      }
    };

    const statusInfo = getStatusInfo(item.status);

    return (
      <View style={styles.card}>
        {/* CABECERA DE LA TARJETA */}
        <View style={styles.cardHeader}>
          <View style={styles.idBadge}>
            <Text style={styles.idText}>#{item.idOrden}</Text>
          </View>
          <Text style={styles.dateText}>{formatIntDate(item.date)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Text style={styles.statusText}>{statusInfo.text}</Text>
          </View>
        </View>

        {/* INFORMACIÓN PRINCIPAL */}
        <View style={styles.infoContainer}>
          {item.name ? (
            <View style={styles.row}>
              <Ionicons name="person" size={18} color="#7f8c8d" />
              <Text style={[styles.infoText, { fontWeight: 'bold' }]}>{item.name}</Text>
            </View>
          ) : null}

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
                <Text style={styles.prodPrice}>${formatCurrency(prod.unitPrice * prod.unitValue)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* FOOTER FINANCIERO */}
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.footerLabel}>Total</Text>
            <Text style={styles.totalAmount}>${formatCurrency(item.total)}</Text>
          </View>
          <View style={styles.divider} />
          <View>
            <Text style={styles.footerLabel}>Abonado</Text>
            <Text style={styles.paidAmount}>${formatCurrency(item.subTotal)}</Text>
          </View>
          <View style={styles.divider} />
          <View>
            <Text style={styles.footerLabel}>Resta</Text>
            <Text style={[styles.debtAmount, { color: debt > 0 ? '#e74c3c' : '#95a5a6' }]}>
              ${formatCurrency(debt)}
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
        onRefresh={fetchOrders}
        refreshing={loading}
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
