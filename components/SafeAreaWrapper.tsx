import { ReactNode } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { Edge, SafeAreaView } from "react-native-safe-area-context";

interface SafeAreaWrapperProps {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
}

export default function SafeAreaWrapper({
  children,
  className,
  style,
  edges = ["top"],
}: SafeAreaWrapperProps) {
  return (
    <SafeAreaView className={className} style={style} edges={edges}>
      {children}
    </SafeAreaView>
  );
}
