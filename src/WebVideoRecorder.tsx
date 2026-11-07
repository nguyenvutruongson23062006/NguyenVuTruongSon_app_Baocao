// Android/iOS dùng camera hệ thống trong Screen.tsx; Expo tự chọn file .web.tsx trên trình duyệt.
export type RecorderProps = {
  onClose: () => void;
  onUse: (uri: string) => void;
};
export default function WebVideoRecorder(_props: RecorderProps) {
  return null;
}
