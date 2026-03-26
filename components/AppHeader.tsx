import type { ReactNode } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import AmbientCircles from "./AmbientCircles";
import NavIconButton from "./NavIconButton";

const ICON = "#3a4a00";

type HomeProps = { variant: "home" };

type InnerProps = {
  variant: "inner";
  title: string;
  right?: ReactNode;
  onBack?: () => void;
};

export type AppHeaderProps = HomeProps | InnerProps;

function HeaderShell({
  children,
  ambientInstanceId = 0,
}: {
  children: ReactNode;
  /** Ana sayfa (0) ile iç sayfa (1) başlıklarında farklı daire düzeni. */
  ambientInstanceId?: number;
}) {
  return (
    <View className="relative overflow-hidden bg-primary-fixed border-b border-on-primary-fixed/15">
      <AmbientCircles preset="header" instanceId={ambientInstanceId} />
      <View className="relative z-10">{children}</View>
    </View>
  );
}

export default function AppHeader(props: AppHeaderProps) {
  const router = useRouter();
  const { t } = useTranslation();

  if (props.variant === "home") {
    return (
      <HeaderShell ambientInstanceId={0}>
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
    <HeaderShell ambientInstanceId={1}>
      <View className="px-5 pt-2 pb-3">
        <View className="relative min-h-[44px] w-full max-w-7xl self-center justify-center">
          <View className="absolute left-0 top-0 bottom-0 justify-center z-10 -ml-1">
            <NavIconButton
              variant="header"
              icon="arrow-left"
              onPress={handleBack}
              accessibilityLabel={t("layout.back")}
              iconSize={24}
            />
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
