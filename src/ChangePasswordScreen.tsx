import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router } from "expo-router";
import { ArrowLeft, LockKeyhole } from "lucide-react-native";
import { useKitchen } from "./store";
import { Button, Input, green, s } from "./ui";

// Hiển thị biểu mẫu ba ô mật khẩu và trạng thái lưu/thành công/lỗi.
export default function ChangePasswordScreen() {
  const { data, changePassword } = useKitchen();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const account = data.accounts.find(
    (a) => a.email === data.session && !a.blocked,
  );

  // Chặn truy cập biểu mẫu khi chưa đăng nhập hoặc tài khoản đã bị khóa.
  if (!account) return <Redirect href="/login" />;

  // Chờ lưu mật khẩu mới thành công rồi xóa các ô nhập; giữ nguyên phiên đăng nhập.
  async function submit() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    setSuccess(false);
    try {
      await changePassword(current, next, confirmation);
      setCurrent("");
      setNext("");
      setConfirmation("");
      setSuccess(true);
      setMessage(
        "Đổi mật khẩu thành công. Hãy dùng mật khẩu mới cho lần đăng nhập sau.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không đổi được mật khẩu. Vui lòng thử lại.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fcfaf3" }}>
      <View
        style={[s.row, { padding: 18, justifyContent: "flex-start", gap: 14 }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại cá nhân"
          hitSlop={12}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/profile")
          }
        >
          <ArrowLeft color={green} size={24} />
        </Pressable>
        <Text style={s.name}>Đổi mật khẩu</Text>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, gap: 14 }}
        >
          <LockKeyhole color={green} size={36} />
          <Text style={s.title}>Bảo vệ tài khoản</Text>
          <Text style={s.muted}>
            Mật khẩu mới cần có ít nhất 6 ký tự và khác mật khẩu hiện tại.
          </Text>
          <Text style={s.name}>Mật khẩu hiện tại</Text>
          <Input
            placeholder="Nhập mật khẩu hiện tại"
            value={current}
            onChangeText={setCurrent}
            secureTextEntry
          />
          <Text style={s.name}>Mật khẩu mới</Text>
          <Input
            placeholder="Nhập mật khẩu mới"
            value={next}
            onChangeText={setNext}
            secureTextEntry
          />
          <Text style={s.name}>Xác nhận mật khẩu mới</Text>
          <Input
            placeholder="Nhập lại mật khẩu mới"
            value={confirmation}
            onChangeText={setConfirmation}
            secureTextEntry
          />
          {!!message && (
            <Text
              accessibilityRole="alert"
              style={{ color: success ? green : "#be4038", lineHeight: 22 }}
            >
              {message}
            </Text>
          )}
          <Button
            title={busy ? "Đang lưu..." : "Lưu mật khẩu mới"}
            onPress={submit}
            disabled={busy}
          />
          {success && (
            <Button
              secondary
              title="Về trang cá nhân"
              onPress={() => router.replace("/profile")}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
