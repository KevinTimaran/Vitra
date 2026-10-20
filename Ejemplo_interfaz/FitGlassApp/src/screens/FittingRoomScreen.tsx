import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../theme';

export const FittingRoomScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="sparkles-outline" size={38} color={Colors.primaryText} />
        </View>
        <Text style={styles.title}>FittingRoomScreen</Text>
        <Text style={styles.subtitle}>
          Probador Virtual · Núcleo Generativo
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Esqueleto Base · Fase 1</Text>
        </View>
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
});
