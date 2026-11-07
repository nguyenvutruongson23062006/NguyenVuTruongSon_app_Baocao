// Điểm cấu hình Expo Router: điều hướng dạng Stack và bảo vệ các màn hình tài khoản.
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActivityIndicator, View } from "react-native";
import { KitchenProvider, useKitchen } from "../src/store";

export const unstable_settings = {
  initialRouteName: "index",
};

// Chờ kho dữ liệu tải xong để quyết định các màn hình được phép truy cập theo phiên đăng nhập.
function Navigation() {
  const { data, ready } = useKitchen();
  const account = data.accounts.find(
    (item) => item.email === data.session && !item.blocked,
  );

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fcfaf3",
        }}
      >
        <ActivityIndicator color="#08764f" size="large" />
      </View>
    );
  }

  return (
    <Stack
      initialRouteName="index"
      screenOptions={{ headerShown: false, animation: "slide_from_right" }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(kham-pha)/home" />
      <Stack.Protected guard={!account}>
        <Stack.Screen name="(tai-khoan)/login" />
        <Stack.Screen name="(tai-khoan)/register" />
      </Stack.Protected>
    </Stack>
  );
}

// Cung cấp vùng an toàn và kho dữ liệu chung trước khi dựng hệ thống điều hướng.
export default function Layout() {
  return (
    <SafeAreaProvider>
      <KitchenProvider>
        <Navigation />
      </KitchenProvider>
    </SafeAreaProvider>
  );
}
