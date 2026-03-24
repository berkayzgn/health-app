import type { ReactNode } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

const ICON = "#3a4a00";

type HomeProps = { variant: "home" };

type InnerProps = {
  variant: "inner";
  title: string;
  right?: ReactNode;
  onBack?: () => void;
};

export type AppHeaderProps = HomeProps | InnerProps;

function HeaderShell({ children }: { children: ReactNode }) {
  return (
    <View className="relative overflow-hidden bg-primary-fixed rounded-b-card border-b border-on-primary-fixed/15">
      <View
        className="absolute -right-14 -top-10 h-36 w-36 rounded-full bg-on-primary-fixed/10"
        pointerEvents="none"
      />
      <View className="relative z-10">{children}</View>
    </View>
  );
}

export default function AppHeader(props: AppHeaderProps) {
  const router = useRouter();
  const { t } = useTranslation();

  if (props.variant === "home") {
    return (
      <HeaderShell>
        <View className="px-5 pt-2 pb-3">
          <View className="relative min-h-[44px] w-full max-w-7xl self-center justify-center">
            <View className="absolute left-0 top-0 bottom-0 justify-center z-10">
              <Pressable
                hitSlop={12}
                onPress={() => router.push("/profile")}
                accessibilityRole="button"
                accessibilityLabel={t("layout.headerProfile")}
                className="p-2 -ml-2 rounded-full active:bg-on-primary-fixed/15"
              >
                <MaterialCommunityIcons name="account-circle-outline" size={28} color={ICON} />
              </Pressable>
            </View>
            <Text
              className="text-on-primary-fixed font-headline text-xl tracking-tighter text-center px-14"
              numberOfLines={1}
            >
              {t("common.appName")}
            </Text>
            <View className="absolute right-0 top-0 bottom-0 justify-center z-10">
              <Pressable
                hitSlop={12}
                onPress={() => router.push("/settings")}
                accessibilityRole="button"
                accessibilityLabel={t("profile.openSettings")}
                className="p-2 -mr-2 rounded-full active:bg-on-primary-fixed/15"
              >
                <MaterialCommunityIcons name="cog-outline" size={24} color={ICON} />
              </Pressable>
            </View>
          </View>
        </View>
      </HeaderShell>
    );
  }

  const handleBack = () => {
    if (props.onBack) {
      props.onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  return (
    <HeaderShell>
      <View className="px-5 pt-2 pb-3">
        <View className="relative min-h-[44px] w-full max-w-7xl self-center justify-center">
          <View className="absolute left-0 top-0 bottom-0 justify-center z-10">
            <Pressable
              onPress={handleBack}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("layout.back")}
              className="p-2 -ml-2 rounded-full active:bg-on-primary-fixed/15"
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color={ICON} />
            </Pressable>
          </View>
          <Text
            className="text-on-primary-fixed font-headline text-xl tracking-tight text-center px-14"
            numberOfLines={1}
          >
            {props.title}
          </Text>
          {props.right ? (
            <View className="absolute right-0 top-0 bottom-0 justify-center z-10 flex-row items-center">
              {props.right}
            </View>
          ) : null}
        </View>
      </View>
    </HeaderShell>
  );
}
