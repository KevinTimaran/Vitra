import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius, Shadows } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxHeightRatio?: number;
  rightAction?: {
    label: string;
    onPress: () => void;
  };
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  maxHeightRatio = 0.75,
  rightAction,
}) => {
  const { colors, isDark } = useTheme();
  const windowHeight = Dimensions.get('window').height;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.dismissArea}
          onPress={onClose}
          activeOpacity={1}
        />
        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.surface,
              maxHeight: windowHeight * maxHeightRatio,
              borderColor: colors.borderLight,
              borderTopWidth: isDark ? 1 : 0,
            },
          ]}
        >
          {/* Grabber */}
          <View style={styles.grabberWrapper}>
            <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          </View>

          {/* Sheet Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
            <View style={styles.titleArea}>
              <Text style={[Typography.headlineMd, { color: colors.primaryText, fontSize: 20, lineHeight: 26 }]}>
                {title}
              </Text>
              {subtitle && (
                <Text style={[Typography.bodySm, { color: colors.secondaryText, marginTop: 2 }]}>
                  {subtitle}
                </Text>
              )}
            </View>

            <View style={styles.headerActions}>
              {rightAction && (
                <TouchableOpacity
                  style={styles.rightActionButton}
                  onPress={rightAction.onPress}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.rightActionText, { color: colors.cta }]}>{rightAction.label}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: colors.surfaceSubtle }]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={colors.primaryText} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sheet Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheetContainer: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.huge,
    ...Shadows.sheet,
  },
  grabberWrapper: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleArea: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightActionButton: {
    marginRight: Spacing.md,
  },
  rightActionText: {
    ...Typography.subhead,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexGrow: 0,
  },
  contentContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
});
