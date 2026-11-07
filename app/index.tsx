// Tuyến /: Chào mừng; tự chuyển đến Trang chủ hoặc Admin nếu phiên đăng nhập còn hiệu lực.. 
import Screen from "../src/Screen";
import { Redirect } from "expo-router";
import { useKitchen } from "../src/store";
export default function Page() {
  const { data } = useKitchen();
  const account = data.accounts.find(
    (item) => item.email === data.session && !item.blocked,
  );
  if (account) {
    return <Redirect href={account.role === "admin" ? "/admin" : "/home"} />;
  }
  return <Screen page="index" />;
}
