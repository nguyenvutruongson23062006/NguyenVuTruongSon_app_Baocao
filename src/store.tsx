// Kho dữ liệu cục bộ dùng React Context và AsyncStorage; không kết nối backend hay SQL.
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import seed from "../data/recipes.json";
// Kiểu công thức được suy ra từ cấu trúc dữ liệu mẫu.
export type Recipe = (typeof seed)[number] & { video?: string };
// Thông tin tài khoản cục bộ: tên, email, mật khẩu, vai trò và trạng thái khóa.
export type Account = {
  name: string;
  email: string;
  password: string;
  role: "user" | "admin";
  blocked: boolean;
};
// Toàn bộ dữ liệu chung được quản lý và lưu trên thiết bị.
export type Kitchen = {
  recipes: Recipe[];
  favorites: string[];
  shopping: { name: string; checked: boolean }[];
  accounts: Account[];
  session: string | null;
  reviews: { recipe: string; name: string; text: string; stars: number }[];
  following: boolean;
};
// Dữ liệu khởi tạo khi thiết bị chưa có dữ liệu lưu, gồm công thức và hai tài khoản mẫu.
const initial: Kitchen = {
  recipes: seed,
  favorites: ["1", "2"],
  shopping: [
    { name: "Thịt gà", checked: false },
    { name: "Cà chua", checked: false },
  ],
  accounts: [
    {
      name: "Nguyễn Vũ Trường Sơn",
      email: "son@bepviet.vn",
      password: "123456",
      role: "user",
      blocked: false,
    },
    {
      name: "Quản trị viên",
      email: "admin@bepviet.vn",
      password: "123456",
      role: "admin",
      blocked: false,
    },
  ],
  session: null,
  reviews: [],
  following: false,
};
// Context chia sẻ dữ liệu, trạng thái tải/lỗi và các thao tác tài khoản cho màn hình.
const Context = createContext<{
  data: Kitchen;
  setData: React.Dispatch<React.SetStateAction<Kitchen>>;
  ready: boolean;
  error: string;
  commitSession: (email: string | null, newAccount?: Account) => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
    confirmation: string,
  ) => Promise<void>;
}>({
  data: initial,
  setData: () => {},
  ready: false,
  error: "",
  commitSession: async () => {},
  changePassword: async () => {},
});
// Bao ứng dụng để các màn hình cùng đọc và cập nhật một kho dữ liệu.
export function KitchenProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState(initial);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const queue = useRef(Promise.resolve());
  const latest = useRef(data);
  latest.current = data;

  // Xếp hàng các lần ghi AsyncStorage để dữ liệu được lưu theo thứ tự.
  function persist(snapshot: Kitchen) {
    const write = queue.current
      .catch(() => {})
      .then(() =>
        AsyncStorage.setItem("bep-viet-v1", JSON.stringify(snapshot)),
      );
    queue.current = write;
    return write;
  }

  // Lưu phiên đăng nhập/đăng xuất và tài khoản mới trước khi cập nhật giao diện.
  async function commitSession(email: string | null, newAccount?: Account) {
    const current = latest.current;
    const next: Kitchen = {
      ...current,
      accounts: newAccount
        ? [...current.accounts, newAccount]
        : current.accounts,
      session: email,
    };
    await persist(next);
    latest.current = next;
    setData(next);
    setError("");
  }
  // Kiểm tra mật khẩu cũ và xác nhận; chỉ cập nhật tài khoản sau khi lưu mật khẩu mới thành công.
  async function changePassword(
    currentPassword: string,
    newPassword: string,
    confirmation: string,
  ) {
    const current = latest.current;
    const account = current.accounts.find(
      (a) => a.email === current.session && !a.blocked,
    );
    if (!account) throw new Error("Vui lòng đăng nhập để đổi mật khẩu.");
    if (!currentPassword || !newPassword || !confirmation)
      throw new Error("Vui lòng nhập đầy đủ thông tin.");
    if (account.password !== currentPassword)
      throw new Error("Mật khẩu hiện tại không đúng.");
    if (newPassword.trim().length < 6)
      throw new Error(
        "Mật khẩu mới phải có ít nhất 6 ký tự, không tính khoảng trắng ở đầu và cuối.",
      );
    if (newPassword !== confirmation)
      throw new Error("Xác nhận mật khẩu mới không khớp.");
    if (newPassword === currentPassword)
      throw new Error("Mật khẩu mới phải khác mật khẩu hiện tại.");
    const next: Kitchen = {
      ...current,
      accounts: current.accounts.map((a) =>
        a.email === account.email ? { ...a, password: newPassword } : a,
      ),
    };
    try {
      await persist(next);
    } catch {
      throw new Error("Không lưu được mật khẩu mới. Vui lòng thử lại.");
    }
    latest.current = next;
    setData(next);
    setError("");
  }
  // Khi mở app: đọc dữ liệu bep-viet-v1, phục hồi phiên và đánh dấu đã tải xong.
  useEffect(() => {
    AsyncStorage.getItem("bep-viet-v1")
      .then((value) => {
        if (value) {
          const stored = JSON.parse(value) as Partial<Kitchen>;
          // Restore only fields supported by the current application.
          const saved: Kitchen = {
            // Món thuộc trạng thái ẩn cũ được đưa về chờ duyệt để quản trị xử lý lại.
            recipes: (stored.recipes ?? initial.recipes).map((recipe) =>
              recipe.status === "hidden"
                ? { ...recipe, status: "pending" }
                : recipe,
            ),
            favorites: stored.favorites ?? initial.favorites,
            shopping: stored.shopping ?? initial.shopping,
            accounts: stored.accounts ?? initial.accounts,
            session: stored.session ?? null,
            reviews: stored.reviews ?? initial.reviews,
            following: stored.following ?? initial.following,
          };
          saved.shopping = saved.shopping.filter(
            (item, index, all) =>
              all.findIndex((x) => x.name === item.name) === index,
          );
          setData(saved);
        }
      })
      .catch(() => setError("Không đọc được dữ liệu đã lưu."))
      .finally(() => setReady(true));
  }, []);
  // Sau khi phục hồi xong: tự lưu mỗi khi dữ liệu chung thay đổi.
  useEffect(() => {
    if (ready) {
      persist(data).catch(() =>
        setError(
          "Không lưu được dữ liệu. Vui lòng kiểm tra dung lượng thiết bị.",
        ),
      );
    }
  }, [data, ready]);
  return (
    <Context.Provider
      value={{ data, setData, ready, error, commitSession, changePassword }}
    >
      {children}
    </Context.Provider>
  );
}
// Hook giúp thành phần truy cập kho dữ liệu mà không phải truyền qua nhiều cấp.
export const useKitchen = () => useContext(Context);
