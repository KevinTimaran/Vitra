import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

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
  const { colors } = useTheme();
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
        <Text style={[Typography.subhead, { color: colors.secondaryText }]}>{label}</Text>
        <Text style={[Typography.headline, { color: colors.primaryText, fontVariant: ['tabular-nums'] }]}>
          {value} {unit}
        </Text>
      </View>

      {/* Slider Track with Monochromatic Thumb */}
      <View style={styles.sliderTrackContainer}>
        <View style={[styles.trackBackground, { backgroundColor: colors.border }]}>
          <View style={[styles.trackFill, { width: `${percentage}%`, backgroundColor: colors.cta }]} />
          <View
            style={[
              styles.thumb,
              {
                left: `${Math.max(percentage - 4, 0)}%`,
                backgroundColor: colors.surface,
                borderColor: colors.cta,
              },
            ]}
          />
        </View>
      </View>

      {/* Stepper Buttons for Fine Tuning */}
      <View style={styles.controlsRow}>
        {leftLabel && <Text style={[Typography.caption, { color: colors.tertiaryText, fontSize: 11 }]}>{leftLabel}</Text>}
        <View
          style={[
            styles.steppersGroup,
            { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
          ]}
        >
          <TouchableOpacity
            style={styles.stepButton}
            onPress={handleDecrement}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="remove" size={14} color={colors.primaryText} />
          </TouchableOpacity>
          <View style={[styles.stepDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={styles.stepButton}
            onPress={handleIncrement}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={14} color={colors.primaryText} />
          </TouchableOpacity>
        </View>
        {rightLabel && <Text style={[Typography.caption, { color: colors.tertiaryText, fontSize: 11 }]}>{rightLabel}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: Spacing.xs,
  },
  sliderTrackContainer: {
    height: 24,
    justifyContent: 'center',
  },
  trackBackground: {
    height: 4,
    borderRadius: 2,
    position: 'relative',
    justifyContent: 'center',
  },
  trackFill: {
    height: 4,
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    top: -7,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  steppersGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  stepButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  stepDivider: {
    width: 1,
    height: 14,
  },
});
