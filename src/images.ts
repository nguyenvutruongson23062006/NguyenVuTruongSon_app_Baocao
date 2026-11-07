// Ảnh món mẫu được đóng gói cùng app; ảnh người dùng chọn vẫn đọc từ URI của thiết bị.
import type { ImageSourcePropType } from "react-native";
import seed from "../data/recipes.json";

const recipeImages: Record<string, ImageSourcePropType> = {
  "1": require("../assets/images/recipes/ga-chien-nuoc-mam.jpg"),
  "2": require("../assets/images/recipes/canh-chua-ca.jpg"),
  "3": require("../assets/images/recipes/banh-flan-caramel.jpg"),
  "4": require("../assets/images/recipes/pho-bo-ha-noi.jpg"),
  "5": require("../assets/images/recipes/goi-cuon-rau-cu.jpg"),
  "6": require("../assets/images/recipes/ga-kho-gung.jpg"),
  "7": require("../assets/images/recipes/mi-y-sot-ca-chua.jpg"),
  "8": require("../assets/images/recipes/com-ga-xoi-mo.jpg"),
};

// Ảnh giới thiệu cố định, không phụ thuộc thứ tự công thức mới đăng.
export const welcomeImage = recipeImages["1"];

// Nhận diện cả link mẫu đã lưu từ trước để tài khoản cũ dùng được ảnh cục bộ.
export function recipeImageSource(uri: string): ImageSourcePropType {
  const sample = seed.find(
    (recipe) => recipe.image === uri || uri === `recipe-image:${recipe.id}`,
  );
  return sample ? recipeImages[sample.id] : { uri };
}
