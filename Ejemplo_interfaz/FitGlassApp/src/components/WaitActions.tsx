import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { gamePalette } from '../theme/gamePalette';
import { useTranslation } from '../contexts/LanguageContext';

interface Props {
  /** Abre la pantalla aparte del juego. */
  onPlay?: () => void;
  /** Cierra la espera sin cancelar: la generación sigue en segundo plano. */
  onBackground: () => void;
  onCancel: () => void;
}

/**
 * Acciones de una espera de generación 3D, con tamaños cómodos: botones de 52 px de alto, texto de una línea
 * que se reduce si no cabe, y zona táctil de 44 px para "Cancelar". Se usa en las 3 pantallas de espera.
 */
export const WaitActions: React.FC<Props> = ({ onPlay, onBackground, onCancel }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.column}>
      {onPlay ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('wait.play')}
          onPress={onPlay}
          style={({ pressed }) => [styles.button, { backgroundColor: gamePalette.primary, opacity: pressed ? 0.85 : 1 }]}
        >
          <Ionicons name="game-controller" size={20} color={gamePalette.white} />
          <Text style={[styles.label, { color: gamePalette.white }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {t('wait.play')}
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('wait.background')}
        onPress={onBackground}
        style={({ pressed }) => [styles.button, styles.outline, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
      >
        <Ionicons name="layers-outline" size={20} color={colors.primaryText} />
        <Text style={[styles.label, { color: colors.primaryText }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {t('wait.background')}
        </Text>
      </Pressable>

      <Pressable accessibilityRole="button" accessibilityLabel={t('wait.cancel')} onPress={onCancel} style={styles.cancel} hitSlop={6}>
        <Text style={[styles.cancelText, { color: colors.tertiaryText }]}>{t('wait.cancel')}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  column: { width: '100%', gap: 12 },
  button: {
    minHeight: 52,
    borderRadius: 999,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  outline: { borderWidth: 1.5 },
  label: { flexShrink: 1, fontSize: 15, fontWeight: '700' },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 13, textDecorationLine: 'underline' },
});
