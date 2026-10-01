import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../theme';

interface SliderControlProps {
  label: string;
  value: number;
  unit?: string;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  leftLabel?: string;
  rightLabel?: string;
}

export const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  unit = '',
  min,
  max,
  step = 1,
  onChange,
  leftLabel,
  rightLabel,
}) => {
  const percentage = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);

  const handleDecrement = () => {
    if (value > min) onChange(Math.max(value - step, min));
  };

  const handleIncrement = () => {
    if (value < max) onChange(Math.min(value + step, max));
  };

  return (
    <View style={styles.container}>
      {/* Header Info */}
      <View style={styles.headerRow}>
        <Text style={[Typography.subhead, styles.label]}>{label}</Text>
        <Text style={[Typography.headline, styles.valueText]}>
          {value} {unit}
        </Text>
      </View>

      {/* Slider Track with Monochromatic Thumb */}
      <View style={styles.sliderTrackContainer}>
        <View style={styles.trackBackground}>
          <View style={[styles.trackFill, { width: `${percentage}%` }]} />
          <View style={[styles.thumb, { left: `${Math.max(percentage - 4, 0)}%` }]} />
        </View>
      </View>

      {/* Stepper Buttons for Fine Tuning */}
      <View style={styles.controlsRow}>
        {leftLabel && <Text style={styles.endLabel}>{leftLabel}</Text>}
        <View style={styles.steppersGroup}>
          <TouchableOpacity
            style={styles.stepButton}
            onPress={handleDecrement}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="remove" size={16} color={Colors.primaryText} />
          </TouchableOpacity>
          <View style={styles.stepDivider} />
          <TouchableOpacity
            style={styles.stepButton}
            onPress={handleIncrement}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="add" size={16} color={Colors.primaryText} />
          </TouchableOpacity>
        </View>
        {rightLabel && <Text style={styles.endLabel}>{rightLabel}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: Spacing.xs,
  },
  label: {
    color: Colors.primaryText,
  },
  valueText: {
    color: Colors.primaryText,
    fontVariant: ['tabular-nums'],
  },
  sliderTrackContainer: {
    height: 24,
    justifyContent: 'center',
  },
  trackBackground: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    position: 'relative',
    justifyContent: 'center',
  },
  trackFill: {
    height: 4,
    backgroundColor: Colors.cta,
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.cta,
    top: -7,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  endLabel: {
    ...Typography.caption,
    color: Colors.tertiaryText,
    fontSize: 11,
  },
  steppersGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  stepButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  stepDivider: {
    width: 1,
    height: 14,
    backgroundColor: Colors.border,
  },
});
