import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

import { Colors as DefaultColors, Typography, Spacing, Radius } from '../theme';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';
import { useTranslation } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface AddGarmentScreenProps {
  onPhotoConfirmed: (uri: string) => void;
  onClose: () => void;
}

export const AddGarmentScreen: React.FC<AddGarmentScreenProps> = ({
  onPhotoConfirmed,
  onClose,
}) => {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [hasCaptured, setHasCaptured] = useState(false);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [capturedCategory, setCapturedCategory] = useState<'Tops' | 'Outerwear' | 'Pants'>('Tops');

  const handleCapture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        if (photo) {
          setCapturedImageUri(photo.uri);
          setHasCaptured(true);
        }
      } catch (err) {
        console.error('Error capturing photo:', err);
      }
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setCapturedImageUri(result.assets[0].uri);
        setHasCaptured(true);
      }
    } catch (err) {
      console.error('Error picking image:', err);
    }
  };

  const handleRetake = () => {
    setHasCaptured(false);
    setCapturedImageUri(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Top Bar with Flash & Close */}
      <View style={[styles.topBar, { backgroundColor: colors.bg }]}>
        <TouchableOpacity
          style={[styles.circleButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={20} color={colors.primaryText} />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={[styles.screenTitle, { color: colors.primaryText }]}>
            {t('addGarment.title')}
          </Text>
          <Text style={[styles.screenSubtitle, { color: colors.secondaryText }]}>
            {hasCaptured ? t('addGarment.confirmCapture') : t('addGarment.cameraFrame')}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.circleButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
            flashOn && [styles.circleButtonActive, { backgroundColor: colors.cta, borderColor: colors.cta }],
          ]}
          onPress={() => setFlashOn(!flashOn)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={flashOn ? 'flash' : 'flash-outline'}
            size={18}
            color={flashOn ? colors.ctaText : colors.primaryText}
          />
        </TouchableOpacity>
      </View>

      {/* Camera Viewport Canvas */}
      <View style={[styles.cameraViewport, { backgroundColor: isDark ? '#121214' : '#0F0F12' }]}>
        {!permission?.granted && !hasCaptured ? (
          <View style={styles.permissionContainer}>
            <Text style={[styles.permissionText, { color: '#F4F4F5' }]}>
              {t('addGarment.cameraPermission') || 'We need camera permission to take pictures of your garments.'}
            </Text>
            <PrimaryButton label="Grant Permission" onPress={requestPermission} />
          </View>
        ) : hasCaptured && capturedImageUri ? (
          <Image source={{ uri: capturedImageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <CameraView 
            style={StyleSheet.absoluteFill} 
            facing="back"
            enableTorch={flashOn}
            ref={cameraRef}
          />
        )}

        {/* Optical corner guides */}
        <View style={[styles.cornerGuide, styles.cornerTopLeft]} />
        <View style={[styles.cornerGuide, styles.cornerTopRight]} />
        <View style={[styles.cornerGuide, styles.cornerBottomLeft]} />
        <View style={[styles.cornerGuide, styles.cornerBottomRight]} />

        {/* Optical Level Axis */}
        <View style={styles.horizontalAxis} />
        <View style={styles.verticalAxis} />

        {/* Preview Object Area */}
        <View style={styles.objectPreviewArea}>
          <View
            style={[
              styles.simulatedGarmentShape,
              hasCaptured && styles.simulatedGarmentCaptured,
            ]}
          >
            <Ionicons
              name={
                capturedCategory === 'Tops'
                  ? 'shirt-outline'
                  : capturedCategory === 'Outerwear'
                  ? 'layers-outline'
                  : 'reorder-two-outline'
              }
              size={80}
              color={hasCaptured ? (isDark ? '#F4F4F5' : '#18181B') : '#71717A'}
            />
            {hasCaptured && (
              <View style={styles.capturedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={styles.capturedBadgeText}>{t('addGarment.detected')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Framing Instructions Tooltip */}
        {!hasCaptured && (
          <View style={styles.framingHint}>
            <Text style={styles.hintText}>{t('addGarment.hint')}</Text>
          </View>
        )}
      </View>

      {/* Control Area */}
      {!hasCaptured ? (
        <View style={[styles.captureControlsSection, { backgroundColor: colors.surface }]}>
          {/* Category selector */}
          <View style={styles.categoryPills}>
            {(['Tops', 'Outerwear', 'Pants'] as const).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.catPill,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderLight },
                  capturedCategory === cat && [styles.catPillActive, { backgroundColor: colors.cta, borderColor: colors.cta }],
                ]}
                onPress={() => setCapturedCategory(cat)}
              >
                <Text
                  style={[
                    styles.catPillText,
                    { color: colors.secondaryText },
                    capturedCategory === cat && [styles.catPillTextActive, { color: colors.ctaText }],
                  ]}
                >
                  {cat === 'Tops' ? t('common.tops') : cat === 'Outerwear' ? t('common.outerwear') : t('common.pants')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Shutter Button */}
          <View style={styles.shutterRow}>
            <TouchableOpacity onPress={handlePickFromGallery} style={styles.galleryButton}>
              <Ionicons name="images-outline" size={26} color={colors.primaryText} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shutterOuter, { borderColor: colors.border }]}
              onPress={handleCapture}
              activeOpacity={0.8}
            >
              <View style={[styles.shutterInner, { backgroundColor: colors.cta }]} />
            </TouchableOpacity>

            <View style={{ width: 44 }} />
          </View>

          <Text style={[styles.captureNote, { color: colors.tertiaryText }]}>
            {t('addGarment.tapShutter')}
          </Text>
        </View>
      ) : (
        <View style={[styles.confirmationSection, { backgroundColor: colors.surface }]}>
          <Text style={[Typography.title2, styles.confirmPrompt, { color: colors.primaryText }]}>
            {t('addGarment.confirmCapture')}
          </Text>
          <Text style={[Typography.caption, styles.confirmSubtitle, { color: colors.secondaryText }]}>
            {t('addGarment.hint')}
          </Text>

          <View style={styles.confirmButtonsRow}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}>
              <SecondaryButton label={t('addGarment.retake')} onPress={handleRetake} icon="refresh" />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label={t('addGarment.analyze')}
                onPress={() => onPhotoConfirmed(capturedImageUri || '')}
                icon="checkmark"
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleButtonActive: {},
  headerTitleBox: {
    alignItems: 'center',
  },
  screenTitle: {
    ...Typography.headline,
  },
  screenSubtitle: {
    ...Typography.micro,
    fontSize: 10,
    marginTop: 1,
  },
  cameraViewport: {
    flex: 1,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    borderRadius: Radius.xl,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    zIndex: 10,
  },
  permissionText: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  cornerGuide: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    zIndex: 2,
  },
  cornerTopLeft: {
    top: 20,
    left: 20,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  cornerTopRight: {
    top: 20,
    right: 20,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  cornerBottomLeft: {
    bottom: 20,
    left: 20,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  cornerBottomRight: {
    bottom: 20,
    right: 20,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  horizontalAxis: {
    position: 'absolute',
    left: 30,
    right: 30,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 2,
  },
  verticalAxis: {
    position: 'absolute',
    top: 30,
    bottom: 30,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 2,
  },
  objectPreviewArea: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  simulatedGarmentShape: {
    width: 170,
    height: 210,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  simulatedGarmentCaptured: {
    borderStyle: 'solid',
    borderColor: '#10B981',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  capturedBadge: {
    position: 'absolute',
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#18181B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  capturedBadgeText: {
    ...Typography.micro,
    color: '#FAFAFA',
    fontSize: 9,
    fontWeight: '700',
  },
  framingHint: {
    position: 'absolute',
    bottom: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    zIndex: 2,
  },
  hintText: {
    ...Typography.caption,
    color: '#F4F4F5',
    fontSize: 11,
  },
  captureControlsSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  categoryPills: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  catPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  catPillActive: {},
  catPillText: {
    ...Typography.micro,
    fontWeight: '600',
  },
  catPillTextActive: {},
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: Spacing.xl,
  },
  galleryButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  captureNote: {
    ...Typography.micro,
    fontSize: 9,
    marginTop: Spacing.md,
    letterSpacing: 0.5,
  },
  confirmationSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  confirmPrompt: {
    textAlign: 'center',
  },
  confirmSubtitle: {
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  confirmButtonsRow: {
    flexDirection: 'row',
  },
});
