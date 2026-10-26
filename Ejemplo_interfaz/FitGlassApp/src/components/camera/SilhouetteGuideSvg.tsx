import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, {
  Path,
  Circle,
  Line,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

interface SilhouetteGuideSvgProps {
  width?: number;
  height?: number;
  strokeColor?: string;
  fillColor?: string;
  gender?: string;
}

export const SilhouetteGuideSvg: React.FC<SilhouetteGuideSvgProps> = ({
  width = 340,
  height = 560,
  strokeColor = 'rgba(212, 175, 55, 0.85)', // Vitra gold accent
  fillColor = 'rgba(212, 175, 55, 0.08)',
  gender = 'female',
}) => {
  // Coordenadas basadas en un viewBox estándar 0 0 360 620
  // La silueta representa la postura A (A-pose) con brazos despegados del torso y piernas firmes
  const isMale = gender === 'male';
  const shoulderWidth = isMale ? 38 : 32;

  return (
    <View style={[styles.container, { width, height }]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 360 620" preserveAspectRatio="xMidYMid meet">
        <Defs>
          <SvgLinearGradient id="silhouetteGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#D4AF37" stopOpacity="0.85" />
            <Stop offset="50%" stopColor="#E5C778" stopOpacity="0.6" />
            <Stop offset="100%" stopColor="#D4AF37" stopOpacity="0.85" />
          </SvgLinearGradient>
          <SvgLinearGradient id="fillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#D4AF37" stopOpacity="0.12" />
            <Stop offset="100%" stopColor="#D4AF37" stopOpacity="0.04" />
          </SvgLinearGradient>
        </Defs>

        {/* Línea guía superior: Cabeza */}
        <Line
          x1="50"
          y1="38"
          x2="310"
          y2="38"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="1.5"
          strokeDasharray="4, 4"
        />
        <SvgText
          x="180"
          y="30"
          fill="rgba(255, 255, 255, 0.85)"
          fontSize="11"
          fontWeight="600"
          textAnchor="middle"
          letterSpacing="1.2"
        >
          LÍMITE SUPERIOR • CABEZA
        </SvgText>

        {/* Línea guía inferior: Pies */}
        <Line
          x1="50"
          y1="575"
          x2="310"
          y2="575"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="1.5"
          strokeDasharray="4, 4"
        />
        <SvgText
          x="180"
          y="592"
          fill="rgba(255, 255, 255, 0.85)"
          fontSize="11"
          fontWeight="600"
          textAnchor="middle"
          letterSpacing="1.2"
        >
          BASE • PIES
        </SvgText>

        {/* Cabeza del sujeto */}
        <Circle
          cx="180"
          cy="85"
          r="32"
          stroke="url(#silhouetteGlow)"
          strokeWidth="2.2"
          fill="url(#fillGrad)"
        />

        {/* Cuerpo completo en Postura A (A-Pose) con brazos claramente separados del torso */}
        {/* Contorno anatómico trazado con precisión para evitar unión de extremidades */}
        <Path
          d={`
            M 172 118
            C 172 128, 160 134, ${180 - shoulderWidth * 2.2} 150
            L ${180 - shoulderWidth * 2.6} 165
            L 105 270
            C 95 285, 92 310, 88 340
            C 86 352, 94 358, 102 352
            C 112 344, 120 315, 128 275
            L 142 205
            L 148 245
            C 152 280, 148 315, 142 350
            L 138 460
            C 136 490, 138 520, 140 565
            C 142 575, 164 575, 166 565
            L 170 480
            L 172 385
            C 174 375, 186 375, 188 385
            L 190 480
            L 194 565
            C 196 575, 218 575, 220 565
            C 222 520, 224 490, 222 460
            L 218 350
            C 212 315, 208 280, 212 245
            L 218 205
            L 232 275
            C 240 315, 248 344, 258 352
            C 266 358, 274 352, 272 340
            C 268 310, 265 285, 255 270
            L ${180 + shoulderWidth * 2.6} 165
            L ${180 + shoulderWidth * 2.2} 150
            C 200 134, 188 128, 188 118
            Z
          `}
          stroke="url(#silhouetteGlow)"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="url(#fillGrad)"
        />

        {/* Indicadores visuales de Postura A (Flechas o arcos en los codos/brazos) */}
        <Line
          x1="126"
          y1="250"
          x2="108"
          y2="280"
          stroke="#D4AF37"
          strokeWidth="1.5"
          strokeDasharray="2, 2"
        />
        <Line
          x1="234"
          y1="250"
          x2="252"
          y2="280"
          stroke="#D4AF37"
          strokeWidth="1.5"
          strokeDasharray="2, 2"
        />

        {/* Eje de simetría central tenue */}
        <Line
          x1="180"
          y1="125"
          x2="180"
          y2="375"
          stroke="rgba(212, 175, 55, 0.3)"
          strokeWidth="1"
          strokeDasharray="6, 6"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
