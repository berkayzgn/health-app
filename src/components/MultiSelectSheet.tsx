import { useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface CatalogItem {
  code: string;
  displayNames: Record<string, string>;
}

interface Props<T extends CatalogItem> {
  visible: boolean;
  title: string;
  hint: string;
  items: T[];
  selected: Set<string>;
  lang: string;
  onToggle: (code: string) => void;
  onClose: () => void;
}

export default function MultiSelectSheet<T extends CatalogItem>({
  visible,
  title,
  hint,
  items,
  selected,
  lang,
  onToggle,
  onClose,
}: Props<T>) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const renderItem = useCallback(
    ({ item }: { item: T }) => {
      const on = selected.has(item.code);
      const label = item.displayNames[lang] ?? item.displayNames.en ?? item.code;
      return (
        <Pressable
          onPress={() => onToggle(item.code)}
          className={`flex-row items-center px-5 py-3.5 active:bg-surface-container-low/80 ${
            on ? "bg-primary-container/15" : "bg-surface-container-lowest"
          }`}
        >
          <MaterialIcons
            name={on ? "check-box" : "check-box-outline-blank"}
            size={24}
            color={on ? "#4e6300" : "#acadad"}
          />
          <Text
            className="ml-3 flex-1 text-[15px] text-on-surface"
            style={{ fontFamily: "Inter_500Medium" }}
          >
            {label}
          </Text>
          {on && <MaterialIcons name="check" size={18} color="#4e6300" />}
        </Pressable>
      );
    },
    [selected, lang, onToggle],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
        />
        <View
          className="max-h-[70%] rounded-t-[1.25rem] border border-b-0 border-surface-container bg-surface-container-lowest"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <View className="px-5 pt-3 pb-2">
            <View className="mb-3 h-1 w-10 self-center rounded-full bg-outline-variant" />
            <Text
              className="text-on-surface text-lg leading-6"
              style={{ fontFamily: "Manrope_700Bold" }}
            >
              {title}
            </Text>
            <Text
              className="mt-1 text-[13px] leading-5 text-on-surface-variant"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              {hint}
            </Text>
          </View>

          <FlatList
            data={items}
            keyExtractor={(item) => item.code}
            renderItem={renderItem}
            ItemSeparatorComponent={() => (
              <View className="mx-5 h-px bg-surface-container" />
            )}
            className="border-t border-surface-container"
          />

          <View className="px-5 pt-3">
            <Pressable
              onPress={onClose}
              className="h-12 items-center justify-center rounded-pill bg-primary-fixed active:opacity-90"
            >
              <Text
                className="text-base font-bold text-on-primary-fixed"
                style={{ fontFamily: "Manrope_700Bold" }}
              >
                {t("onboarding.sheetDone")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
