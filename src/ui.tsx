// Các thành phần giao diện tái sử dụng trong ứng dụng.
import React from "react";
import { recipeImageSource } from "./images";
import {
  Pressable,
  Text,
  TextInput,
  View,
  Image,
  StyleSheet,
} from "react-native";
import { ChevronRight, Clock, Heart, Star } from "lucide-react-native";
import { router } from "expo-router";
import { Recipe, useKitchen } from "./store";
export const green = "#08764f";
// Nút dùng chung: hỗ trợ kiểu chính/phụ và trạng thái không thể bấm.
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled }}
      style={[
        s.button,
        secondary && s.secondary,
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text
        style={{
          color: secondary ? green : "white",
          fontWeight: "700",
          fontSize: 15,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
// Ô nhập dùng chung: hỗ trợ mật khẩu ẩn ký tự và nội dung nhiều dòng.
export function Input({
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  multiline = false,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
}) {
  return (
    <TextInput
      accessibilityLabel={placeholder}
      placeholder={placeholder}
      placeholderTextColor="#8c9693"
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      multiline={multiline}
      style={[
        s.input,
        multiline && { minHeight: 95, textAlignVertical: "top" },
      ]}
    />
  );
}
// Nhóm nút lựa chọn dùng cho danh mục và bộ lọc.
export function Chips({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={s.wrap}>
      {items.map((x) => (
        <Pressable
          accessibilityRole="button"
          key={x}
          accessibilityState={{ selected: value === x }}
          onPress={() => onChange(x)}
          style={[s.chip, value === x && { backgroundColor: green }]}
        >
          <Text
            style={{
              color: value === x ? "white" : "#466057",
              fontSize: 12,
              fontWeight: "600",
            }}
          >
            {x}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
// Thẻ món ăn: mở chi tiết theo id và thêm/bỏ yêu thích bằng nút trái tim.
export function RecipeCard({
  recipe,
  compact = false,
}: {
  recipe: Recipe;
  compact?: boolean;
}) {
  const { data, setData } = useKitchen();
  const loved = data.favorites.includes(recipe.id);
  return (
    <View
      style={[
        s.card,
        compact && { flexDirection: "row", alignItems: "center" },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          router.push({ pathname: "/recipe", params: { id: recipe.id } })
        }
        style={
          compact
            ? { flex: 1, flexDirection: "row", gap: 12, alignItems: "center" }
            : {}
        }
      >
        <Image
          source={recipeImageSource(recipe.image)}
          style={compact ? { width: 78, height: 85, borderRadius: 14 } : s.food}
        />
        <View style={{ padding: compact ? 0 : 12, flex: 1 }}>
          <Text style={s.name}>{recipe.name}</Text>
          <Text style={s.muted}>{recipe.category}</Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              marginTop: 8,
            }}
          >
            <Star size={12} color="#ef9a21" fill="#ef9a21" />
            <Text style={s.muted}>
              {recipe.rating} · {recipe.minutes} phút
            </Text>
          </View>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Yêu thích"
        accessibilityState={{ selected: loved }}
        hitSlop={8}
        onPress={() =>
          setData((d) => ({
            ...d,
            favorites: loved
              ? d.favorites.filter((i) => i !== recipe.id)
              : [...d.favorites, recipe.id],
          }))
        }
        style={
          compact
            ? { padding: 12 }
            : {
                position: "absolute",
                top: 10,
                right: 10,
                backgroundColor: "white",
                padding: 7,
                borderRadius: 30,
              }
        }
      >
        <Heart
          size={19}
          color={loved ? "#ec645b" : green}
          fill={loved ? "#ec645b" : "transparent"}
        />
      </Pressable>
    </View>
  );
}
// Bộ định dạng React Native dùng chung: màu chữ, khoảng cách, khung, nút và thẻ món.
export const s = StyleSheet.create({
  button: {
    backgroundColor: green,
    padding: 16,
    borderRadius: 24,
    alignItems: "center",
    marginVertical: 7,
  },
  secondary: {
    backgroundColor: "#e9f2eb",
    borderWidth: 1,
    borderColor: "#d5e4da",
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e0e6df",
    borderRadius: 13,
    padding: 14,
    fontSize: 14,
    color: "#153e32",
    marginVertical: 6,
  },
  wrap: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginVertical: 10 },
  chip: {
    backgroundColor: "#efeee7",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#eeeede",
  },
  food: { width: "100%", height: 150 },
  name: { fontSize: 15, fontWeight: "700", color: "#173d31", lineHeight: 23 },
  muted: { fontSize: 12, color: "#829087", lineHeight: 21 },
  title: {
    fontSize: 25,
    fontWeight: "800",
    color: "#123e30",
    lineHeight: 34,
    marginVertical: 12,
  },
  section: {
    fontSize: 18,
    fontWeight: "700",
    color: "#173d31",
    marginTop: 20,
    marginBottom: 12,
  },
  panel: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 18,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#eeeee4",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 12,
  },
  line: { height: 1, backgroundColor: "#eeeee5" },
});
