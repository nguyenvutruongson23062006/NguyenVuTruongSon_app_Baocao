import React, { useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Button, s } from "./ui";

type Props = {
  placeholder: string;
  existing: string[];
  multiple?: boolean;
  onAdd: (values: string[]) => void;
};
// Chuẩn hóa tên để phát hiện nguyên liệu trùng dù khác dấu hoặc chữ hoa/thường.
const key = (value: string) =>
  value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase();
// Ô thêm nguyên liệu cho danh sách mua sắm và màn hình gợi ý món.
export default function IngredientInput({
  placeholder,
  existing,
  multiple = false,
  onAdd,
}: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const input = useRef<TextInput>(null);
  // Kiểm tra ô trống/trùng; thêm dữ liệu hợp lệ, xóa nội dung ô và đưa con trỏ về ô nhập.
  function add() {
    const values = (multiple ? value.split(/[,;\n]/) : [value])
      .map((v) => v.trim())
      .filter(Boolean);
    if (!values.length) {
      setError("Bạn hãy nhập tên nguyên liệu vào ô phía trên trước khi thêm.");
      input.current?.focus();
      return;
    }
    const seen = new Set(existing.map(key));
    const fresh = values.filter((v) => {
      const k = key(v);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (!fresh.length) {
      setError("Nguyên liệu này đã có trong danh sách.");
      input.current?.focus();
      return;
    }
    onAdd(fresh);
    setValue("");
    setError("");
    input.current?.focus();
  }
  return (
    <View>
      <Text style={s.muted}>
        {multiple
          ? "Nhập tên nguyên liệu, ngăn cách nhiều nguyên liệu bằng dấu phẩy."
          : "Nhập nguyên liệu trước, sau đó bấm Thêm nguyên liệu."}
      </Text>
      <TextInput
        ref={input}
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        placeholderTextColor="#8c9693"
        value={value}
        onChangeText={(v) => {
          setValue(v);
          setError("");
        }}
        onSubmitEditing={add}
        returnKeyType="done"
        blurOnSubmit={false}
        style={[s.input, error ? { borderColor: "#be4038" } : {}]}
      />
      {!!error && (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{ color: "#be4038", lineHeight: 21, marginVertical: 4 }}
        >
          {error}
        </Text>
      )}
      <Button secondary title="+ Thêm nguyên liệu" onPress={add} />
    </View>
  );
}
