import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';

interface Viewport3DPlaceholderProps {
  currentGarmentName?: string;
  cameraAngle?: 'front' | 'side' | 'back' | 'angle';
  onAngleChange?: (angle: 'front' | 'side' | 'back' | 'angle') => void;
  heightRatio?: number;
  highlightFit?: boolean;
  selectedLayer?: string;
  customOverlay?: React.ReactNode;
}

export const Viewport3DPlaceholder: React.FC<Viewport3DPlaceholderProps> = ({
  currentGarmentName,
  cameraAngle = 'front',
  onAngleChange,
  heightRatio = 0.58,
  highlightFit = false,
  selectedLayer,
  customOverlay,
}) => {
  const [activeAngle, setActiveAngle] = useState<'front' | 'side' | 'angle'>('front');
  const [rotationDeg, setRotationDeg] = useState(0);

  const handleAngle = (angle: 'front' | 'side') => {
    setActiveAngle(angle);
    setRotationDeg(angle === 'front' ? 0 : 90);
    onAngleChange?.(angle);
  };

  const handleRotate = () => {
    setRotationDeg((prev) => (prev + 45) % 360);
  };

  const handleReset = () => {
    setActiveAngle('front');
    setRotationDeg(0);
    onAngleChange?.('front');
  };

  const screenHeight = Dimensions.get('window').height;
  const viewportHeight = screenHeight * heightRatio;

  return (
    <View style={[styles.container, { height: viewportHeight }]}>
      {/* 3D Studio Studio Boundary & Lighting */}
      <View style={styles.studioLighting}>
        <View style={styles.overheadKeyLight} />
        <View style={styles.groundPedestal} />
        <View style={styles.gridPlane}>
          <View style={styles.gridLineHorizontal} />
          <View style={[styles.gridLineHorizontal, { top: '35%' }]} />
          <View style={[styles.gridLineHorizontal, { top: '65%' }]} />
        </View>
      </View>

      {/* Central Neutral Silhouette Placeholder */}
      <View style={styles.avatarContainer}>
        {/* Silhouette Head */}
        <View style={styles.silhouetteHead} />
        {/* Silhouette Neck */}
        <View style={styles.silhouetteNeck} />
        {/* Silhouette Torso & Garment Area */}
        <View
          style={[
            styles.silhouetteTorso,
            highlightFit && styles.silhouetteTorsoFitActive,
          ]}
        >
          {/* Subtle Fit Tension Lines */}
          {highlightFit && (
            <>
              <View style={[styles.tensionLine, { top: 28, width: '75%' }]} />
              <View style={[styles.tensionLine, { top: 62, width: '60%' }]} />
            </>
          )}
        </View>
        {/* Arms */}
        <View style={styles.silhouetteArmLeft} />
        <View style={styles.silhouetteArmRight} />
        {/* Legs / Lower Silhouette */}
        <View style={styles.silhouetteLegsContainer}>
          <View style={styles.silhouetteLegLeft} />
          <View style={styles.silhouetteLegRight} />
        </View>
      </View>

      {/* Studio Viewport Metadata Stamp */}
      <View style={styles.metaStamp}>
        <View style={styles.liveIndicator} />
        <Text style={styles.metaText}>
          3D VIEWPORT · {rotationDeg}° · {activeAngle.toUpperCase()}
        </Text>
      </View>

      {/* Garment Tag Indicator */}
      {currentGarmentName && (
        <View style={styles.garmentBadge}>
          <Text style={styles.garmentBadgeCategory}>ACTIVE GARMENT</Text>
          <Text style={styles.garmentBadgeName} numberOfLines={1}>
            {currentGarmentName}
          </Text>
        </View>
      )}

      {/* Floating Camera & Pose Controls (Glassmorphic) */}
      <View style={styles.floatingControls}>
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={handleRotate}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-outline" size={18} color={Colors.primaryText} />
          <Text style={styles.floatingLabel}>Rotate</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.floatingButton,
            activeAngle === 'front' && styles.floatingButtonActive,
          ]}
          onPress={() => handleAngle('front')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="body-outline"
            size={18}
            color={activeAngle === 'front' ? Colors.ctaText : Colors.primaryText}
          />
          <Text
            style={[
              styles.floatingLabel,
              activeAngle === 'front' && { color: Colors.ctaText },
            ]}
          >
            Front
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.floatingButton,
            activeAngle === 'side' && styles.floatingButtonActive,
          ]}
          onPress={() => handleAngle('side')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="walk-outline"
            size={18}
            color={activeAngle === 'side' ? Colors.ctaText : Colors.primaryText}
          />
          <Text
            style={[
              styles.floatingLabel,
              activeAngle === 'side' && { color: Colors.ctaText },
            ]}
          >
            Side
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.floatingButton}
          onPress={handleReset}
          activeOpacity={0.7}
        >
          <Ionicons name="scan-outline" size={17} color={Colors.primaryText} />
          <Text style={styles.floatingLabel}>Reset</Text>
        </TouchableOpacity>
      </View>

      {/* Custom Child Overlay (e.g. Fit results or outfit selectors) */}
      {customOverlay}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#EFEFEF',
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  studioLighting: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overheadKeyLight: {
    position: 'absolute',
    top: -40,
    width: 260,
    height: 180,
    borderRadius: 130,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  groundPedestal: {
    position: 'absolute',
    bottom: 30,
    width: 220,
    height: 48,
    borderRadius: 110,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    transform: [{ scaleY: 0.35 }],
  },
  gridPlane: {
    position: 'absolute',
    bottom: 10,
    width: '90%',
    height: 50,
    opacity: 0.25,
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#9E9E9E',
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 280,
  },
  silhouetteHead: {
    width: 32,
    height: 42,
    borderRadius: 16,
    backgroundColor: '#D1D5DB',
  },
  silhouetteNeck: {
    width: 12,
    height: 14,
    backgroundColor: '#CBD5E1',
    marginTop: -2,
  },
  silhouetteTorso: {
    width: 66,
    height: 94,
    borderRadius: 12,
    backgroundColor: '#94A3B8',
    marginTop: -2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  silhouetteTorsoFitActive: {
    backgroundColor: '#64748B',
    borderWidth: 1,
    borderColor: '#475569',
  },
  tensionLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 1,
  },
  silhouetteArmLeft: {
    position: 'absolute',
    top: 48,
    left: 18,
    width: 14,
    height: 84,
    borderRadius: 7,
    backgroundColor: '#CBD5E1',
    transform: [{ rotate: '8deg' }],
  },
  silhouetteArmRight: {
    position: 'absolute',
    top: 48,
    right: 18,
    width: 14,
    height: 84,
    borderRadius: 7,
    backgroundColor: '#CBD5E1',
    transform: [{ rotate: '-8deg' }],
  },
  silhouetteLegsContainer: {
    flexDirection: 'row',
    width: 58,
    justifyContent: 'space-between',
    marginTop: -4,
  },
  silhouetteLegLeft: {
    width: 20,
    height: 110,
    borderRadius: 8,
    backgroundColor: '#94A3B8',
  },
  silhouetteLegRight: {
    width: 20,
    height: 110,
    borderRadius: 8,
    backgroundColor: '#94A3B8',
  },
  metaStamp: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  metaText: {
    ...Typography.micro,
    color: Colors.secondaryText,
  },
  garmentBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.lg,
    maxWidth: 160,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  garmentBadgeCategory: {
    ...Typography.micro,
    color: Colors.tertiaryText,
    fontSize: 9,
  },
  garmentBadgeName: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.primaryText,
    marginTop: 1,
  },
  floatingControls: {
    position: 'absolute',
    right: Spacing.md,
    bottom: Spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: Radius.lg,
    padding: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    ...Shadows.floating,
  },
  floatingButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  floatingButtonActive: {
    backgroundColor: Colors.cta,
  },
  floatingLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: Colors.secondaryText,
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
