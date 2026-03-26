import { Pressable } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useStore } from "../store/useStore";
import { DARK_RGB, LIGHT_RGB, rgbTripletToHex } from "../theme/designRgb";

export type NavIconVariant = "surface" | "header";

type Props = {
  /** `header`: lime başlık şeridi; `surface`: normal sayfa / sheet. */
  variant?: NavIconVariant;
  icon: "arrow-left" | "close";
  onPress: () => void;
  accessibilityLabel: string;
  hitSlop?: number;
  /** Varsayılan: header 24, surface 22 */
  iconSize?: number;
};

/**
 * Geri ok ve kapat (X) için ortak yuvarlak, tema arka planlı kontrol.
 */
export default function NavIconButton({
  variant = "surface",
  icon,
  onPress,
  accessibilityLabel,
  hitSlop = 10,
  iconSize,
}: Props) {
  const theme = useStore((s) => s.theme);
  const palette = theme === "dark" ? DARK_RGB : LIGHT_RGB;

  const resolvedSize = iconSize ?? (variant === "header" ? 24 : 22);
  const iconColor = rgbTripletToHex(
    variant === "header" ? palette["on-primary-fixed"] : palette["on-surface"]
  );

  const surfaceClasses =
    "bg-surface-container active:bg-surface-container-high";
  const headerClasses = "bg-on-primary-fixed/20 active:bg-on-primary-fixed/30";

  return (
    <Pressable
      onPress={onPress}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={`h-10 w-10 items-center justify-center rounded-full ${variant === "header" ? headerClasses : surfaceClasses}`}
    >
      <MaterialCommunityIcons name={icon} size={resolvedSize} color={iconColor} />
    </Pressable>
  );
}
