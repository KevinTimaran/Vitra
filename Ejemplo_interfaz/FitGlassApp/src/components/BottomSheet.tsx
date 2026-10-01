import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';

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
            { maxHeight: windowHeight * maxHeightRatio },
          ]}
        >
          {/* iOS Grabber */}
          <View style={styles.grabberWrapper}>
            <View style={styles.grabber} />
          </View>

          {/* Sheet Header */}
          <View style={styles.header}>
            <View style={styles.titleArea}>
              <Text style={[Typography.title2, styles.title]}>{title}</Text>
              {subtitle && (
                <Text style={[Typography.caption, styles.subtitle]}>{subtitle}</Text>
              )}
            </View>

            <View style={styles.headerActions}>
              {rightAction && (
                <TouchableOpacity
                  style={styles.rightActionButton}
                  onPress={rightAction.onPress}
                  activeOpacity={0.7}
                >
                  <Text style={styles.rightActionText}>{rightAction.label}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={Colors.primaryText} />
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
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  titleArea: {
    flex: 1,
  },
  title: {
    color: Colors.primaryText,
  },
  subtitle: {
    color: Colors.secondaryText,
    marginTop: 2,
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
    color: Colors.cta,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSubtle,
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
