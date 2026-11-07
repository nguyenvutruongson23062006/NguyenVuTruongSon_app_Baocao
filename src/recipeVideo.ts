import * as FileSystem from "expo-file-system/legacy";

// Sao chép video khỏi bộ nhớ tạm vào Documents của app trên Android/iOS.
export async function keepRecipeVideo(uri: string, fileName?: string | null) {
  if (!FileSystem.documentDirectory) {
    // URI do ImagePicker cung cấp vẫn dùng được để xem video trong phiên hiện tại.
    // Không gọi API hệ thống tệp khi môi trường chạy không có Documents.
    if (uri.startsWith("blob:") || uri.startsWith("data:video/")) return uri;
    throw new Error(
      "Lưu video trên thiết bị cần mở app bằng Expo Go trên Android/iOS.",
    );
  }
  const directory = `${FileSystem.documentDirectory}recipe-videos/`;
  const extension =
    (fileName || uri)
      .split("?")[0]
      .match(/\.(mp4|mov|m4v|webm)$/i)?.[1]
      ?.toLowerCase() || "mp4";
  const target = `${directory}${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  try {
    await FileSystem.copyAsync({ from: uri, to: target });
    const info = await FileSystem.getInfoAsync(target);
    if (!info.exists || info.isDirectory || info.size === 0)
      throw new Error("empty video");
    return target;
  } catch {
    await FileSystem.deleteAsync(target, { idempotent: true }).catch(() => {});
    throw new Error(
      "Không lưu được video. Hãy kiểm tra dung lượng thiết bị và chọn lại.",
    );
  }
}
