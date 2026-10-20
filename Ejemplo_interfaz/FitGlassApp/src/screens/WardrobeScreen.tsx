import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../theme';

import { TouchableOpacity } from 'react-native';

export const WardrobeScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="shirt-outline" size={38} color={Colors.primaryText} />
        </View>
        <Text style={styles.title}>WardrobeScreen</Text>
        <Text style={styles.subtitle}>
          Armario Digital - Catálogo de Prendas
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Fase 2 & 3 · Ingesta & 3D</Text>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => (navigation ? navigation.navigate('AddGarment') : null)}
          activeOpacity={0.8}
        >
          <Ionicons name="camera-outline" size={18} color={Colors.ctaText} />
          <Text style={styles.addBtnText}>Añadir Prenda al Armario</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.title1,
    color: Colors.primaryText,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.subhead,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  badge: {
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  badgeText: {
    ...Typography.caption,
    color: Colors.tertiaryText,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cta,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    gap: Spacing.xs,
    marginTop: Spacing.xl,
    width: '100%',
  },
  addBtnText: {
    ...Typography.callout,
    color: Colors.ctaText,
    fontWeight: '600',
  },
});
