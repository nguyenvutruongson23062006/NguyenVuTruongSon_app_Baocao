// Biểu mẫu nguyên liệu và các bước nấu dùng trong màn hình đăng/sửa công thức.
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import { Button, Input, s } from "./ui";

export type IngredientDraft = { name: string; amount: string };
// Tách tên và lượng từ dữ liệu đã lưu; nguyên liệu cũ chưa có lượng vẫn đọc được.
export function readIngredient(value: string): IngredientDraft {
  const separator = value.indexOf(" — ");
  return separator < 0
    ? { name: value, amount: "" }
    : { name: value.slice(0, separator), amount: value.slice(separator + 3) };
}
// Ghép tên và định lượng về chuỗi để tương thích dữ liệu công thức hiện tại.
export function writeIngredient(value: IngredientDraft) {
  return value.amount.trim()
    ? `${value.name.trim()} — ${value.amount.trim()}`
    : value.name.trim();
}

// Nút xóa từng dòng với vùng bấm đủ rộng và nhãn cho trình đọc màn hình.
function Remove({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        minWidth: 44,
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Trash2 size={20} color="#be4038" />
    </Pressable>
  );
}

// Biểu mẫu từng nguyên liệu và từng bước: sửa trực tiếp, thêm dòng, xóa và cập nhật số thứ tự.
export default function RecipeFields({
  ingredients,
  onIngredientsChange,
  steps,
  onStepsChange,
}: {
  ingredients: IngredientDraft[];
  onIngredientsChange: (values: IngredientDraft[]) => void;
  steps: string[];
  onStepsChange: (values: string[]) => void;
}) {
  return (
    <View style={{ gap: 14 }}>
      <Text style={s.section}>Nguyên liệu</Text>
      <Text style={s.muted}>
        Mỗi nguyên liệu một dòng. Điền lượng dùng nếu có.
      </Text>
      {ingredients.map((item, index) => (
        <View key={index} style={[s.panel, { gap: 8 }]}>
          <View style={s.row}>
            <Text style={s.name}>Nguyên liệu {index + 1}</Text>
            <Remove
              label={`Xóa nguyên liệu ${index + 1}`}
              onPress={() => {
                const remaining = ingredients.filter((_, i) => i !== index);
                onIngredientsChange(
                  remaining.length ? remaining : [{ name: "", amount: "" }],
                );
              }}
            />
          </View>
          <Text style={s.muted}>Tên nguyên liệu</Text>
          <Input
            placeholder={`Tên nguyên liệu ${index + 1} (ví dụ: Thịt gà)`}
            value={item.name}
            onChangeText={(name) =>
              onIngredientsChange(
                ingredients.map((item, i) =>
                  i === index ? { ...item, name } : item,
                ),
              )
            }
          />
          <Text style={s.muted}>Định lượng (không bắt buộc)</Text>
          <Input
            placeholder={`Định lượng ${index + 1} (ví dụ: 500 g, 2 muỗng canh)`}
            value={item.amount}
            onChangeText={(amount) =>
              onIngredientsChange(
                ingredients.map((item, i) =>
                  i === index ? { ...item, amount } : item,
                ),
              )
            }
          />
        </View>
      ))}
      <Button
        secondary
        title="+ Thêm nguyên liệu"
        onPress={() =>
          onIngredientsChange([...ingredients, { name: "", amount: "" }])
        }
      />
      <Text style={s.section}>Các bước thực hiện</Text>
      <Text style={s.muted}>
        Viết từng bước riêng. Số thứ tự được cập nhật tự động.
      </Text>
      {steps.map((text, index) => (
        <View key={index} style={[s.panel, { gap: 8 }]}>
          <View style={s.row}>
            <Text style={s.name}>Bước {index + 1}</Text>
            <Remove
              label={`Xóa bước ${index + 1}`}
              onPress={() => {
                const remaining = steps.filter((_, i) => i !== index);
                onStepsChange(remaining.length ? remaining : [""]);
              }}
            />
          </View>
          <Input
            placeholder={`Nội dung bước ${index + 1}`}
            value={text}
            multiline
            onChangeText={(value) =>
              onStepsChange(
                steps.map((step, i) => (i === index ? value : step)),
              )
            }
          />
        </View>
      ))}
      <Button
        secondary
        title="+ Thêm bước nấu"
        onPress={() => onStepsChange([...steps, ""])}
      />
    </View>
  );
}
