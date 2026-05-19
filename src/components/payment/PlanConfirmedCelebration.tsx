import { useEffect, useMemo } from "react";
import { Modal, View, Text, StyleSheet, Dimensions, Pressable } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const ORIGIN_X = SCREEN_W / 2;
const ORIGIN_Y = SCREEN_H * 0.38;

const CONFETTI_COLORS = ["#4e6300", "#c5e300", "#ffd54f", "#ff8a65", "#4dd0e1", "#ba68c8", "#81c784"];
const PIECE_COUNT = 56;

type ParticleSpec = {
  tx: number;
  ty: number;
  rot: number;
  w: number;
  h: number;
  color: string;
  delay: number;
  round: boolean;
};

function buildParticles(): ParticleSpec[] {
  return Array.from({ length: PIECE_COUNT }, (_, i) => {
    const angle = (i / PIECE_COUNT) * Math.PI * 2 + (i % 7) * 0.12;
    const dist = 90 + (i % 11) * 18;
    return {
      tx: Math.cos(angle) * dist,
      ty: Math.sin(angle) * dist - 60 - (i % 5) * 12,
      rot: (i % 2 === 0 ? 1 : -1) * (220 + (i % 9) * 40),
      w: i % 3 === 0 ? 10 : 7,
      h: i % 4 === 0 ? 14 : 9,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: (i % 8) * 35,
      round: i % 5 === 0,
    };
  });
}

function ConfettiPiece({ spec, active }: { spec: ParticleSpec; active: boolean }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      spec.delay,
      withTiming(1, { duration: 1500, easing: Easing.out(Easing.cubic) }),
    );
  }, [active, spec.delay, progress]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const gravity = p * p * 140;
    return {
      opacity: 1 - p * 0.85,
      transform: [
        { translateX: spec.tx * p },
        { translateY: spec.ty * p + gravity },
        { rotate: `${spec.rot * p}deg` },
        { scale: 1 - p * 0.25 },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.piece,
        {
          left: ORIGIN_X - spec.w / 2,
          top: ORIGIN_Y - spec.h / 2,
          width: spec.w,
          height: spec.h,
          backgroundColor: spec.color,
          borderRadius: spec.round ? spec.w : 2,
        },
        style,
      ]}
    />
  );
}

type Props = {
  visible: boolean;
  title: string;
  subtitle: string;
  onDone: () => void;
};

/** Geçici plan onay kutlaması — konfeti patlaması + başarı kartı */
export default function PlanConfirmedCelebration({ visible, title, subtitle, onDone }: Props) {
  const particles = useMemo(() => buildParticles(), []);
  const cardScale = useSharedValue(0.82);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      cardScale.value = 0.82;
      cardOpacity.value = 0;
      return;
    }

    cardOpacity.value = withTiming(1, { duration: 220 });
    cardScale.value = withSequence(
      withSpring(1.06, { damping: 12, stiffness: 180 }),
      withSpring(1, { damping: 14, stiffness: 200 }),
    );

    const timer = setTimeout(onDone, 2800);
    return () => clearTimeout(timer);
  }, [visible, onDone, cardOpacity, cardScale]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onDone}>
      <Pressable style={styles.backdrop} onPress={onDone}>
        {particles.map((spec, i) => (
          <ConfettiPiece key={i} spec={spec} active={visible} />
        ))}

        <Animated.View style={[styles.card, cardStyle]}>
          <View style={styles.iconWrap}>
            <MaterialIcons name="celebration" size={36} color="#4e6300" />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(26, 28, 24, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  piece: {
    position: "absolute",
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#f4f6e8",
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(78, 99, 0, 0.2)",
    shadowColor: "#4e6300",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(197, 227, 0, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#191c18",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#444846",
    textAlign: "center",
  },
});
