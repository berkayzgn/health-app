import { useEffect, useRef } from "react";
import { View, Animated, Easing } from "react-native";

function SkeletonBar({
  className,
  style,
}: {
  className?: string;
  style?: object;
}) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.65,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      className={`rounded-xl bg-surface-container ${className ?? ""}`}
      style={[{ opacity }, style]}
    />
  );
}

export default function LabelScanSkeleton() {
  return (
    <View className="flex-1 px-6 pt-8">
      <SkeletonBar className="mb-3 h-7 w-[55%]" />
      <SkeletonBar className="mb-8 h-4 w-full" />
      <SkeletonBar className="mb-4 h-14 w-full rounded-2xl" />
      <View className="mb-8 flex-row gap-3">
        <SkeletonBar className="h-36 flex-1 rounded-2xl" />
        <SkeletonBar className="h-36 flex-1 rounded-2xl" />
      </View>
      <SkeletonBar className="mb-4 h-6 w-[45%]" />
      <SkeletonBar className="mb-3 h-16 w-full" />
      <SkeletonBar className="mb-3 h-16 w-full" />
      <SkeletonBar className="h-16 w-full" />
    </View>
  );
}
