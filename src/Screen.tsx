// Giao diện và xử lý các màn hình Bếp Việt. Các file trong app/ truyền page vào thành phần này.
import IngredientInput from "./IngredientInput";
import WebVideoRecorder from "./WebVideoRecorder";
import { keepRecipeVideo } from "./recipeVideo";
import { recipeImageSource, welcomeImage } from "./images";
import RecipeFields, {
  IngredientDraft,
  readIngredient,
  writeIngredient,
} from "./RecipeFields";
import Slider from "@react-native-community/slider";
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Home,
  Search,
  Heart,
  UserRound,
  ChefHat,
  ShoppingBasket,
  ChevronLeft,
  ChevronRight,
  Check,
  Trash2,
  Camera,
  ShieldCheck,
  LogOut,
  BookOpen,
  Users,
  Clock,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import { useVideoPlayer, VideoView } from "expo-video";
import { useKitchen, Recipe } from "./store";
import { Button, Input, Chips, RecipeCard, s, green } from "./ui";
// Tên tiêu đề hiển thị trên thanh đầu của từng màn hình.
const titles: Record<string, string> = {
  login: "Đăng nhập",
  register: "Đăng ký",
  home: "Bếp Việt",
  search: "Tìm kiếm món ăn",
  recipe: "Chi tiết công thức",
  cooking: "Hướng dẫn nấu ăn",
  favorites: "Món ăn yêu thích",
  mine: "Công thức của tôi",
  editor: "Đăng / sửa công thức",
  shopping: "Danh sách mua sắm",
  suggest: "Gợi ý theo nguyên liệu",
  reviews: "Đánh giá và bình luận",
  profile: "Hồ sơ cá nhân",
  author: "Chi tiết tác giả",
  admin: "Tổng quan Admin",
  moderation: "Kiểm duyệt công thức",
  manage: "Quản lý công thức",
  users: "Quản lý người dùng",
};
// Bốn mục điều hướng chính ở thanh dưới cùng.
const tabs = [
  { page: "home", label: "Trang chủ", Icon: Home },
  { page: "search", label: "Tìm kiếm", Icon: Search },
  { page: "favorites", label: "Yêu thích", Icon: Heart },
  { page: "profile", label: "Cá nhân", Icon: UserRound },
];
// Danh mục dùng khi tìm kiếm và đăng công thức.
const categories = ["Tất cả", "Món Việt", "Món Á", "Món Âu", "Món chay"];
// Mở một màn hình; truyền id khi cần xem hoặc sửa một công thức cụ thể.
const go = (page: string, id?: string) =>
  router.push({ pathname: `/${page}` as any, params: id ? { id } : {} });
// Phát video của công thức hoặc video đang xem trước trong biểu mẫu.
function RecipeVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  const [videoError, setVideoError] = useState("");
  useEffect(() => {
    const subscription = player.addListener("statusChange", (event) => {
      setVideoError(
        event.status === "error"
          ? "Không tải được video hướng dẫn. Hãy bấm Thử lại video."
          : "",
      );
    });
    return () => subscription.remove();
  }, [player]);
  return (
    <View style={{ gap: 8 }}>
      <VideoView
        player={player}
        style={{
          width: "100%",
          height: 240,
          borderRadius: 22,
          backgroundColor: "#172a23",
        }}
        contentFit="contain"
        nativeControls
        fullscreenOptions={{ enable: true }}
      />
      {!!videoError && (
        <>
          <Text
            accessibilityRole="alert"
            style={{ color: "#be4038", lineHeight: 23 }}
          >
            {videoError}
          </Text>
          <Button
            secondary
            title="Thử lại video"
            onPress={async () => {
              try {
                setVideoError("");
                await player.replaceAsync(uri);
              } catch {
                setVideoError("Chưa mở được video trên thiết bị này.");
              }
            }}
          />
        </>
      )}
    </View>
  );
}
// Chọn nội dung màn hình theo page và kết nối các thao tác với kho dữ liệu chung.
export default function Screen({ page }: { page: string }) {
  const { data, setData, ready, error, commitSession } = useKitchen();
  const params = useLocalSearchParams<{ id?: string; filter?: string }>();
  const recipe =
    data.recipes.find((r) => r.id === params.id) || data.recipes[0];
  const account = data.accounts.find((a) => a.email === data.session);
  const isAdmin = account?.role === "admin" && !account.blocked;
  // Trạng thái tìm kiếm, lọc danh mục và bộ lọc đang được chọn.
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Tất cả");
  const [filter, setFilter] = useState(params.filter || "Tất cả");
  useEffect(() => {
    setFilter(params.filter || "Tất cả");
  }, [params.filter]);
  // Các ô nhập tài khoản và trạng thái chờ xử lý đăng nhập hoặc đăng ký.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  // Bước nấu hiện tại và đồng hồ đếm ngược; thời gian được tính bằng giây.
  const [step, setStep] = useState(0);
  const [seconds, setSeconds] = useState(900);
  const [timerMinutes, setTimerMinutes] = useState(15);
  const [running, setRunning] = useState(false);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [item, setItem] = useState("");
  // Dữ liệu người dùng đang nhập trong biểu mẫu đăng hoặc sửa công thức.
  const [dishName, setDishName] = useState(
    page === "editor" && params.id ? recipe.name : "",
  );
  const [description, setDescription] = useState(
    page === "editor" && params.id ? recipe.description : "",
  );
  const [photo, setPhoto] = useState(
    page === "editor" && params.id ? recipe.image : "",
  );
  const [video, setVideo] = useState(
    page === "editor" && params.id ? recipe.video || "" : "",
  );
  const [videoBusy, setVideoBusy] = useState(false);
  const [webRecorderOpen, setWebRecorderOpen] = useState(false);
  const videoPickerBusy = useRef(false);
  const [minutes, setMinutes] = useState(
    page === "editor" && params.id ? String(recipe.minutes) : "30",
  );
  const [level, setLevel] = useState(
    page === "editor" && params.id ? recipe.level : "Dễ",
  );
  const [editorIngredients, setEditorIngredients] = useState<IngredientDraft[]>(
    page === "editor" && params.id
      ? recipe.ingredients.map(readIngredient)
      : [{ name: "", amount: "" }],
  );
  const [instructions, setInstructions] = useState<string[]>(
    page === "editor" && params.id ? recipe.steps : [""],
  );
  const [stars, setStars] = useState(5);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] =
    useMicrophonePermissions();
  const camera = useRef<CameraView>(null);
  useEffect(() => {
    if (page === "editor" && params.id && ready) {
      setEditorIngredients(recipe.ingredients.map(readIngredient));
      setDishName(recipe.name);
      setDescription(recipe.description);
      setPhoto(recipe.image);
      setVideo(recipe.video || "");
      setMinutes(String(recipe.minutes));
      setLevel(recipe.level);
      setCategory(recipe.category);
      setInstructions(recipe.steps);
    }
  }, [page, params.id, ready]);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(
      () =>
        setSeconds((n) => {
          if (n <= 1) {
            setRunning(false);
            setMessage("Đã hết thời gian hẹn giờ!");
            return 0;
          }
          return n - 1;
        }),
      1000,
    );
    return () => clearInterval(timer);
  }, [running]);
  const approved = data.recipes.filter((r) => r.status === "approved");
  // Chọn món đã duyệt có số sao cao nhất để hiển thị trên banner Trang chủ.
  const topRatedRecipe = approved.reduce<Recipe | undefined>(
    (highest, current) =>
      !highest || current.rating > highest.rating ? current : highest,
    undefined,
  );
  // Bỏ dấu và chuyển chữ thường để tìm kiếm tiếng Việt thuận tiện hơn.
  const normalize = (t: string) =>
    t
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .toLowerCase();
  // Kết hợp từ khóa, danh mục, thời gian và độ khó để lọc món đã duyệt.
  const found = approved.filter(
    (r) =>
      normalize(r.name).includes(normalize(query)) &&
      (category === "Tất cả" || r.category === category) &&
      (filter !== "Dưới 30 phút" || r.minutes <= 30) &&
      (filter !== "Dễ" || r.level === "Dễ"),
  );
  // Cập nhật trạng thái duyệt hoặc từ chối công thức và hiện thông báo.
  const changeStatus = (id: string, status: "approved" | "rejected") => {
    setData((d) => ({
      ...d,
      recipes: d.recipes.map((r) => (r.id === id ? { ...r, status } : r)),
    }));
    setMessage(
      status === "approved"
        ? "Đã duyệt và hiển thị công thức."
        : "Đã từ chối công thức.",
    );
  };
  // Kiểm tra thông tin đăng ký/đăng nhập; chờ lưu phiên xong rồi mới chuyển màn hình.
  async function auth() {
    if (authBusy) return;
    if (!email.trim() || !password) {
      setMessage("Vui lòng nhập email và mật khẩu.");
      return;
    }
    if (page === "register") {
      if (
        !name.trim() ||
        !/^\S+@\S+\.\S+$/.test(email) ||
        password.length < 6 ||
        password !== confirm
      ) {
        setMessage(
          "Nhập họ tên, email hợp lệ, mật khẩu ít nhất 6 ký tự và xác nhận trùng khớp.",
        );
        return;
      }
      if (data.accounts.some((a) => a.email === email.trim().toLowerCase())) {
        setMessage("Email đã được đăng ký.");
        return;
      }
      setAuthBusy(true);
      try {
        await commitSession(email.trim().toLowerCase(), {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role: "user",
          blocked: false,
        });
        router.replace("/home");
      } catch {
        setMessage("Không lưu được tài khoản. Vui lòng thử lại.");
      } finally {
        setAuthBusy(false);
      }
    } else {
      const a = data.accounts.find(
        (a) =>
          a.email === email.trim().toLowerCase() && a.password === password,
      );
      if (!a || a.blocked) {
        setMessage("Thông tin không đúng hoặc tài khoản đã bị khóa.");
        return;
      }
      setAuthBusy(true);
      try {
        await commitSession(a.email);
        router.replace(a.role === "admin" ? "/admin" : "/home");
      } catch {
        setMessage("Không lưu được phiên đăng nhập. Vui lòng thử lại.");
      } finally {
        setAuthBusy(false);
      }
    }
  }
  // Xin quyền và chọn ảnh món ăn từ thư viện thiết bị.
  async function pick() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled) {
        setPhoto(result.assets[0].uri);
        setMessage("");
      }
    } catch {
      setMessage("Không thể mở thư viện ảnh.");
    }
  }
  // Xin quyền camera và mở giao diện chụp ảnh món ăn.
  async function openCamera() {
    try {
      setMessage("");
      const result = permission?.granted
        ? permission
        : await requestPermission();
      if (result.granted) setCameraOpen(true);
      else
        setMessage(
          "Bạn cần cấp quyền camera để chụp ảnh món ăn. Bạn cũng có thể chọn ảnh từ thư viện.",
        );
    } catch {
      setMessage(
        "Không mở được camera trên thiết bị này. Bạn có thể chọn ảnh từ thư viện.",
      );
    }
  }
  // Chọn video rồi sao chép vào thư mục lâu dài trước khi đưa vào công thức.
  async function pickVideo(source: "library" | "camera" = "library") {
    if (videoPickerBusy.current) return;
    videoPickerBusy.current = true;
    setVideoBusy(true);
    setMessage("");
    try {
      if (source === "camera") {
        // Trình duyệt dùng hộp quay webcam riêng; điện thoại dùng camera hệ thống.
        if (Platform.OS === "web") {
          setWebRecorderOpen(true);
          return;
        }
        if (Platform.OS !== "android" && Platform.OS !== "ios") {
          setMessage(
            "Quay video trực tiếp cần mở app bằng Expo Go trên điện thoại. Bạn vẫn có thể chọn video có sẵn khi thử trên trình duyệt.",
          );
          return;
        }
        const cameraPermission =
          await ImagePicker.requestCameraPermissionsAsync();
        if (!cameraPermission.granted) {
          setMessage("Bạn cần cho phép camera để quay video.");
          return;
        }
        const microphone = microphonePermission?.granted
          ? microphonePermission
          : await requestMicrophonePermission();
        if (!microphone.granted) {
          setMessage("Bạn cần cho phép micro để quay video có âm thanh.");
          return;
        }
      }
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ["videos"],
              videoMaxDuration: 300,
              videoQuality:
                ImagePicker.UIImagePickerControllerQualityType.Medium,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["videos"],
              allowsEditing: true,
            });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 100 * 1024 * 1024) {
        setMessage("Video quá lớn. Vui lòng chọn video không quá 100 MB.");
        return;
      }
      const saved = await keepRecipeVideo(asset.uri, asset.fileName);
      setVideo(saved);
      if (saved.startsWith("blob:")) {
        setMessage(
          "Video đã chọn và có thể xem thử. Khi thử bằng trình duyệt, video chỉ dùng trong phiên hiện tại; sau khi tải lại trang cần chọn lại. Dùng Expo Go trên điện thoại để lưu video lâu dài.",
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không chọn được video. Vui lòng thử lại.",
      );
    } finally {
      videoPickerBusy.current = false;
      setVideoBusy(false);
    }
  }
  // Kiểm tra biểu mẫu và quyền sửa; lưu công thức ở trạng thái chờ duyệt.
  function saveRecipe() {
    if (videoPickerBusy.current) return;
    if (!account) {
      go("login");
      return;
    }
    if (
      editorIngredients.some((item) => !item.name.trim() && item.amount.trim())
    ) {
      setMessage("Hãy nhập tên cho nguyên liệu đã có định lượng.");
      return;
    }
    const savedIngredients = editorIngredients
      .filter((item) => item.name.trim())
      .map(writeIngredient);
    const savedSteps = instructions.map((step) => step.trim()).filter(Boolean);
    if (
      !dishName.trim() ||
      !photo ||
      !savedIngredients.length ||
      !savedSteps.length ||
      !Number.isFinite(Number(minutes)) ||
      Number(minutes) <= 0
    ) {
      setMessage(
        "Cần tên món, ảnh, thời gian hợp lệ, nguyên liệu và các bước nấu.",
      );
      return;
    }
    const old = params.id
      ? data.recipes.find((r) => r.id === params.id)
      : undefined;
    if (
      old &&
      old.author !== account.name &&
      old.author !== "Bạn" &&
      !isAdmin
    ) {
      setMessage("Bạn không thể sửa công thức này.");
      return;
    }
    const entry: Recipe = {
      id: old?.id || Date.now().toString(),
      name: dishName.trim(),
      description: description.trim(),
      category: category === "Tất cả" ? "Món Việt" : category,
      minutes: Number(minutes),
      level,
      rating: old?.rating || 0,
      image: photo,
      video: video || undefined,
      author: account.name,
      status: "pending",
      ingredients: savedIngredients,
      steps: savedSteps,
    };
    setData((d) => ({
      ...d,
      recipes: old
        ? d.recipes.map((r) => (r.id === old.id ? entry : r))
        : [entry, ...d.recipes],
    }));
    go("mine");
  }
  // Hiển thị danh sách thẻ món ăn hoặc thông báo khi chưa có kết quả.
  function list(recipes: Recipe[], compact = true) {
    return recipes.length ? (
      recipes.map((r) => <RecipeCard key={r.id} recipe={r} compact={compact} />)
    ) : (
      <View style={s.panel}>
        <ChefHat color={green} size={32} />
        <Text style={s.section}>Chưa có món ăn</Text>
        <Text style={s.muted}>
          Thử thay đổi bộ lọc hoặc thêm công thức mới.
        </Text>
      </View>
    );
  }
  // Thêm nguyên liệu vào danh sách mua sắm, tránh thêm trùng tên.
  function addShopping(names: string[]) {
    setData((d) => ({
      ...d,
      shopping: [
        ...d.shopping,
        ...[...new Set(names)]
          .filter(
            (n) => !d.shopping.some((i) => normalize(i.name) === normalize(n)),
          )
          .map((n) => ({ name: n, checked: false })),
      ],
    }));
    setMessage("Đã thêm nguyên liệu vào danh sách mua sắm.");
  }
  let body: React.ReactNode;
  // Màn hình chào mừng: giới thiệu ứng dụng và nút bắt đầu.
  if (page === "index")
    body = (
      <View style={{ flexGrow: 1 }}>
        <Text style={{ color: green, letterSpacing: 4, fontWeight: "800" }}>
          BẾP VIỆT
        </Text>
        <Image
          source={welcomeImage}
          resizeMode="cover"
          style={{
            flexGrow: 1,
            flexShrink: 1,
            flexBasis: 0,
            width: "100%",
            minHeight: 140,
            borderRadius: 80,
            marginVertical: 16,
          }}
        />
        <Text
          style={[s.title, { fontSize: 32, lineHeight: 40, marginVertical: 8 }]}
        >
          Khám phá thế giới <Text style={{ color: "#e87330" }}>món ngon.</Text>
        </Text>
        <Text style={[s.muted, { fontSize: 14, lineHeight: 22 }]}>
          Một chút cảm hứng, một bữa cơm ngon. Những công thức gần gũi cho căn
          bếp của bạn.
        </Text>
        <View style={{ paddingTop: 8 }}>
          <Button title="Bắt đầu ngay →" onPress={() => go("home")} />
          <Button
            title="Tôi đã có tài khoản"
            secondary
            onPress={() => go("login")}
          />
        </View>
      </View>
    );
  // Màn hình đăng nhập/đăng ký: dùng chung biểu mẫu, thay đổi theo page.
  else if (page === "login" || page === "register")
    body = (
      <View>
        <ChefHat size={55} color={green} />
        <Text style={s.title}>{titles[page]}</Text>
        <Text style={s.muted}>
          {page === "login"
            ? "Chào mừng bạn trở lại căn bếp!"
            : "Tạo tài khoản và chia sẻ niềm vui nấu ăn."}
        </Text>
        {page === "register" && (
          <Input value={name} onChangeText={setName} placeholder="Họ và tên" />
        )}
        <Input value={email} onChangeText={setEmail} placeholder="Email" />
        <Input
          value={password}
          onChangeText={setPassword}
          placeholder="Mật khẩu"
          secureTextEntry
        />
        {page === "register" && (
          <Input
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Xác nhận mật khẩu"
            secureTextEntry
          />
        )}
        <Button
          title={authBusy ? "Đang xử lý..." : titles[page]}
          disabled={authBusy}
          onPress={auth}
        />
        <Button
          secondary
          title={
            page === "login"
              ? "Chưa có tài khoản? Đăng ký"
              : "Đã có tài khoản? Đăng nhập"
          }
          onPress={() => go(page === "login" ? "register" : "login")}
        />
      </View>
    );
  // Trang chủ: lời chào, món có sao cao nhất, món nổi bật và lối vào gợi ý nguyên liệu.
  else if (page === "home")
    body = (
      <>
        <View style={s.row}>
          <View>
            <Text style={s.muted}>HÔM NAY BẠN MUỐN NẤU GÌ?</Text>
            <Text style={s.title}>
              Xin chào, {account?.name.split(" ").pop() || "bạn"} ☀
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => go("profile")}>
            <View
              style={{
                backgroundColor: "#e4eedf",
                padding: 14,
                borderRadius: 30,
              }}
            >
              <UserRound color={green} />
            </View>
          </Pressable>
        </View>
        {topRatedRecipe && (
          <View
            style={{
              backgroundColor: "#f4e9cb",
              borderRadius: 24,
              overflow: "hidden",
              marginVertical: 16,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Xem món ${topRatedRecipe.name}`}
              onPress={() => go("recipe", topRatedRecipe.id)}
            >
              <Image
                source={recipeImageSource(topRatedRecipe.image)}
                style={{ height: 195, width: "100%" }}
              />
            </Pressable>
            <View style={{ padding: 20 }}>
              <Text
                style={{ color: "#b86a28", fontSize: 11, letterSpacing: 2 }}
              >
                MÓN ĂN ĐƯỢC ƯA THÍCH NHẤT
              </Text>
              <Text style={s.title}>{topRatedRecipe.name}</Text>
              <Text
                style={{
                  color: "#b86a28",
                  fontSize: 14,
                  fontWeight: "600",
                  marginBottom: 8,
                }}
              >
                {topRatedRecipe.rating > 0
                  ? `★ ${topRatedRecipe.rating.toFixed(1)} / 5`
                  : "Chưa có đánh giá"}{" "}
                · {topRatedRecipe.minutes} phút
              </Text>
              <Button
                title="Xem công thức →"
                onPress={() => go("recipe", topRatedRecipe.id)}
              />
            </View>
          </View>
        )}
        <View style={s.row}>
          <Text style={s.section}>Món ăn nổi bật</Text>
          <Pressable accessibilityRole="button" onPress={() => go("search")}>
            <Text style={{ color: green }}>Xem tất cả →</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {approved.map((r) => (
            <View key={r.id} style={{ width: "48%" }}>
              <RecipeCard recipe={r} />
            </View>
          ))}
        </View>
        <Button
          secondary
          title="Gợi ý món từ nguyên liệu sẵn có"
          onPress={() => go("suggest")}
        />
      </>
    );
  // Tìm kiếm công thức theo tên, danh mục và các bộ lọc.
  else if (page === "search")
    body = (
      <>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Tìm tên món ăn..."
        />
        <Chips items={categories} value={category} onChange={setCategory} />
        <Text style={s.section}>Bộ lọc</Text>
        <Chips
          items={["Tất cả", "Dưới 30 phút", "Dễ"]}
          value={filter}
          onChange={setFilter}
        />
        <Text style={s.muted}>{found.length} công thức dành cho bạn</Text>
        {list(found)}
      </>
    );
  // Chi tiết món ăn: thông tin, nguyên liệu, cách làm và lối vào nấu/đánh giá.
  else if (page === "recipe")
    body = (
      <>
        <Image
          source={recipeImageSource(recipe.image)}
          resizeMode="cover"
          // Giới hạn chiều rộng vì ảnh cục bộ có kích thước gốc lớn hơn màn hình.
          style={{ width: "100%", height: 260, borderRadius: 24 }}
        />
        <Text style={s.title}>{recipe.name}</Text>
        <Text style={{ color: "#da8b1a" }}>
          ★ {recipe.rating} · {recipe.minutes} phút · {recipe.level}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => go("author", recipe.id)}
        >
          <Text style={[s.muted, { marginTop: 12 }]}>
            Công thức bởi {recipe.author} →
          </Text>
        </Pressable>
        <Chips
          items={["Tổng quan", "Nguyên liệu", "Cách làm"]}
          value={filter === "Tất cả" ? "Tổng quan" : filter}
          onChange={setFilter}
        />
        {(filter === "Tất cả" || filter === "Tổng quan") && (
          <Text style={[s.muted, { fontSize: 15, lineHeight: 26 }]}>
            {recipe.description}
          </Text>
        )}
        {filter !== "Cách làm" && (
          <>
            <Text style={s.section}>Nguyên liệu</Text>
            {recipe.ingredients.map((x, i) => (
              <View key={i} style={s.row}>
                <Text style={s.name}>✓ {x}</Text>
                <Text style={s.muted}>{i === 0 ? "500 g" : "Vừa đủ"}</Text>
              </View>
            ))}
            <Button
              secondary
              title="+ Thêm vào danh sách mua sắm"
              onPress={() => addShopping(recipe.ingredients)}
            />
          </>
        )}
        {filter === "Cách làm" &&
          recipe.steps.map((x, i) => (
            <View key={i} style={s.panel}>
              <Text style={s.name}>Bước {i + 1}</Text>
              <Text style={s.muted}>{x}</Text>
            </View>
          ))}
        <Button
          title="Bắt đầu nấu ăn"
          onPress={() => go("cooking", recipe.id)}
        />
        <Button
          secondary
          title="Đánh giá và bình luận"
          onPress={() => go("reviews", recipe.id)}
        />
      </>
    );
  // Hướng dẫn nấu: video, nội dung từng bước, nút chuyển bước và thanh trượt hẹn giờ.
  else if (page === "cooking")
    body = (
      <>
        {recipe.video ? (
          <RecipeVideo key={recipe.video} uri={recipe.video} />
        ) : (
          <Image
            source={recipeImageSource(recipe.image)}
            resizeMode="cover"
            style={{ width: "100%", height: 240, borderRadius: 22 }}
          />
        )}
        <Text style={s.title}>
          Bước {step + 1}/{recipe.steps.length}
        </Text>
        <View
          style={[
            s.panel,
            { paddingHorizontal: 44, minHeight: 144, justifyContent: "center" },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bước trước"
            accessibilityState={{ disabled: step === 0 }}
            disabled={step === 0}
            onPress={() => setStep((current) => Math.max(0, current - 1))}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 44,
              alignItems: "center",
              justifyContent: "center",
              opacity: step === 0 ? 0.3 : 1,
            }}
          >
            <ChevronLeft color={green} size={26} />
          </Pressable>
          <Text style={s.section}>
            {step === 0 ? "Sơ chế và chuẩn bị" : `Thực hiện bước ${step + 1}`}
          </Text>
          <Text style={[s.muted, { fontSize: 16, lineHeight: 28 }]}>
            {recipe.steps[step]}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              step === recipe.steps.length - 1 ? "Hoàn thành" : "Bước tiếp"
            }
            onPress={() =>
              step === recipe.steps.length - 1
                ? go("reviews", recipe.id)
                : setStep((current) =>
                    Math.min(recipe.steps.length - 1, current + 1),
                  )
            }
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {step === recipe.steps.length - 1 ? (
              <Check color={green} size={26} />
            ) : (
              <ChevronRight color={green} size={26} />
            )}
          </Pressable>
        </View>
        <View style={s.panel}>
          <Text style={s.name}>Hẹn giờ nấu ăn</Text>
          <Text style={s.title}>
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
          </Text>
          <Text style={s.muted}>
            Kéo để chọn thời gian: {timerMinutes} phút
          </Text>
          <Slider
            accessibilityLabel="Thời gian hẹn giờ nấu ăn"
            accessibilityValue={{
              min: 1,
              max: 120,
              now: timerMinutes,
              text: `${timerMinutes} phút`,
            }}
            style={{ width: "100%", height: 44 }}
            minimumValue={1}
            maximumValue={120}
            step={1}
            value={timerMinutes}
            minimumTrackTintColor={green}
            maximumTrackTintColor="#dce8df"
            thumbTintColor={green}
            onSlidingStart={() => setRunning(false)}
            onValueChange={(value) => {
              const minutes = Math.round(value);
              setRunning(false);
              setTimerMinutes(minutes);
              setSeconds(minutes * 60);
              setMessage("");
            }}
          />
          <View style={s.row}>
            <Text style={s.muted}>1 phút</Text>
            <Text style={s.muted}>120 phút</Text>
          </View>
          <Button
            title={running ? "Tạm dừng" : "Bắt đầu hẹn giờ"}
            disabled={seconds === 0}
            onPress={() => setRunning(!running)}
          />
        </View>
      </>
    );
  // Danh sách món người dùng đã đánh dấu yêu thích.
  else if (page === "favorites")
    body = (
      <>
        <Chips
          items={["Tất cả", "Dưới 30 phút"]}
          value={filter}
          onChange={setFilter}
        />
        {list(
          approved.filter(
            (r) =>
              data.favorites.includes(r.id) &&
              (filter === "Tất cả" || r.minutes <= 30),
          ),
        )}
      </>
    );
  // Công thức của tôi: lọc theo trạng thái và mở biểu mẫu chỉnh sửa.
  else if (page === "mine")
    body = (
      <>
        <Chips
          items={["Tất cả", "Đã đăng", "Chờ duyệt", "Bị từ chối"]}
          value={filter}
          onChange={setFilter}
        />
        {data.recipes
          .filter(
            (r) =>
              (r.author === account?.name || r.author === "Bạn") &&
              (filter === "Tất cả" ||
                r.status ===
                  (
                    {
                      "Đã đăng": "approved",
                      "Chờ duyệt": "pending",
                      "Bị từ chối": "rejected",
                    } as Record<string, string>
                  )[filter]),
          )
          .map((r) => (
            <View key={r.id}>
              <RecipeCard recipe={r} compact />
              <Text style={s.muted}>
                Trạng thái:{" "}
                {r.status === "approved"
                  ? "Đã duyệt"
                  : r.status === "pending"
                    ? "Chờ duyệt"
                    : "Bị từ chối"}
              </Text>
              <Button
                secondary
                title="Chỉnh sửa công thức"
                onPress={() => go("editor", r.id)}
              />
            </View>
          ))}
        <Button
          title="+ Đăng công thức mới"
          onPress={() => go(account ? "editor" : "login")}
        />
      </>
    );
  // Đăng/sửa công thức: ảnh, thông tin món, nguyên liệu và các bước thực hiện.
  else if (page === "editor")
    body = (
      <>
        <Pressable
          accessibilityRole="button"
          onPress={pick}
          style={[
            s.panel,
            { height: 175, alignItems: "center", justifyContent: "center" },
          ]}
        >
          {photo ? (
            <Image
              source={recipeImageSource(photo)}
              style={{ width: "100%", height: 145, borderRadius: 15 }}
            />
          ) : (
            <>
              <Camera color={green} size={36} />
              <Text style={s.muted}>Chọn ảnh món ăn từ thư viện</Text>
            </>
          )}
        </Pressable>
        <Button secondary title="Chụp ảnh món ăn" onPress={openCamera} />
        <Text style={s.section}>Video hướng dẫn (không bắt buộc)</Text>
        <Text style={s.muted}>
          Chọn video hoặc quay trực tiếp trên điện thoại. Tối đa 100 MB; video
          quay mới tối đa 5 phút.
        </Text>
        {!!video && <RecipeVideo key={video} uri={video} />}
        <Button
          secondary
          title={
            videoBusy
              ? "Đang lưu video..."
              : video
                ? "Thay video"
                : "+ Chọn video hướng dẫn"
          }
          disabled={videoBusy}
          onPress={() => pickVideo("library")}
        />
        <Button
          secondary
          title="Quay video hướng dẫn"
          disabled={videoBusy}
          onPress={() => pickVideo("camera")}
        />
        {!!video && (
          <Button
            secondary
            title="Xóa video khỏi công thức"
            disabled={videoBusy}
            onPress={() => setVideo("")}
          />
        )}
        <Input
          value={dishName}
          onChangeText={setDishName}
          placeholder="Tên món ăn"
        />
        <Input
          value={description}
          onChangeText={setDescription}
          placeholder="Mô tả ngắn về món ăn"
          multiline
        />
        <Text style={s.section}>Danh mục</Text>
        <Chips
          items={categories.slice(1)}
          value={category === "Tất cả" ? "Món Việt" : category}
          onChange={setCategory}
        />
        <Input
          value={minutes}
          onChangeText={setMinutes}
          placeholder="Thời gian nấu (phút)"
        />
        <Chips items={["Dễ", "Vừa", "Khó"]} value={level} onChange={setLevel} />
        <RecipeFields
          ingredients={editorIngredients}
          onIngredientsChange={setEditorIngredients}
          steps={instructions}
          onStepsChange={setInstructions}
        />
        <Button
          title="Gửi công thức chờ duyệt"
          onPress={saveRecipe}
          disabled={videoBusy}
        />
      </>
    );
  // Danh sách mua sắm: thêm, đánh dấu đã mua, lọc và xóa nguyên liệu.
  else if (page === "shopping")
    body = (
      <>
        <Chips
          items={["Tất cả", "Cần mua", "Đã mua"]}
          value={filter}
          onChange={setFilter}
        />
        {data.shopping
          .filter(
            (i) =>
              filter === "Tất cả" ||
              (filter === "Đã mua" ? i.checked : !i.checked),
          )
          .map((i) => (
            <View
              key={i.name}
              style={[s.row, { borderBottomWidth: 1, borderColor: "#e7e8df" }]}
            >
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  setData((d) => ({
                    ...d,
                    shopping: d.shopping.map((x) =>
                      x.name === i.name ? { ...x, checked: !x.checked } : x,
                    ),
                  }))
                }
                style={{
                  flexDirection: "row",
                  gap: 12,
                  alignItems: "center",
                  flex: 1,
                }}
              >
                <View
                  style={{
                    width: 23,
                    height: 23,
                    borderWidth: 1,
                    borderColor: green,
                    borderRadius: 5,
                    backgroundColor: i.checked ? green : "transparent",
                  }}
                >
                  {i.checked && <Check color="white" size={20} />}
                </View>
                <Text
                  style={{
                    color: "#214638",
                    textDecorationLine: i.checked ? "line-through" : "none",
                  }}
                >
                  {i.name}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Xóa nguyên liệu"
                onPress={() =>
                  setData((d) => ({
                    ...d,
                    shopping: d.shopping.filter((x) => x.name !== i.name),
                  }))
                }
              >
                <Trash2 size={18} color="#d35c50" />
              </Pressable>
            </View>
          ))}
        <IngredientInput
          placeholder="Tên nguyên liệu cần mua"
          existing={data.shopping.map((i) => i.name)}
          onAdd={addShopping}
        />
      </>
    );
  // Gợi ý món bằng cách đối chiếu nguyên liệu đang có với các công thức đã duyệt.
  else if (page === "suggest")
    body = (
      <>
        <Text style={s.section}>Nguyên liệu bạn đang có</Text>
        <Chips
          items={ingredients}
          value=""
          onChange={(v) => setIngredients(ingredients.filter((i) => i !== v))}
        />
        <IngredientInput
          placeholder="Ví dụ: Gà, cà chua, trứng"
          existing={ingredients}
          multiple
          onAdd={(values) => {
            setIngredients((current) => [...current, ...values]);
            setMessage("");
          }}
        />
        <Text style={s.section}>
          {ingredients.length
            ? "Món phù hợp với nguyên liệu của bạn"
            : "Thêm nguyên liệu để nhận gợi ý"}
        </Text>
        {ingredients.length > 0 &&
          list(
            approved.filter((r) =>
              r.ingredients.some((i) =>
                ingredients.some((x) => normalize(i).includes(normalize(x))),
              ),
            ),
          )}
      </>
    );
  // Đọc bình luận, gửi số sao và cập nhật điểm đánh giá của món.
  else if (page === "reviews")
    body = (
      <>
        <View style={[s.panel, { alignItems: "center" }]}>
          <Text style={s.title}>{recipe.rating || "Chưa có"}</Text>
          <Text style={{ color: "#eca526", fontSize: 26 }}>★★★★★</Text>
          <Text style={s.muted}>{recipe.name}</Text>
        </View>
        {data.reviews
          .filter((r) => r.recipe === recipe.id)
          .map((r, i) => (
            <View key={i} style={s.panel}>
              <Text style={s.name}>
                {r.name} · {"★".repeat(r.stars)}
              </Text>
              <Text style={s.muted}>{r.text}</Text>
            </View>
          ))}
        <Chips
          items={["1", "2", "3", "4", "5"]}
          value={String(stars)}
          onChange={(x) => setStars(Number(x))}
        />
        <Input
          value={item}
          onChangeText={setItem}
          placeholder="Chia sẻ trải nghiệm món ăn..."
          multiline
        />
        <Button
          title="Gửi đánh giá"
          onPress={() => {
            if (!account) {
              go("login");
              return;
            }
            if (!item.trim()) {
              setMessage("Bạn hãy viết nội dung đánh giá trước khi gửi.");
              return;
            }
            if (item.trim()) {
              setData((d) => {
                const reviews = [
                  ...d.reviews,
                  {
                    recipe: recipe.id,
                    name: account.name,
                    text: item.trim(),
                    stars,
                  },
                ];
                const ratings = reviews.filter((r) => r.recipe === recipe.id);
                return {
                  ...d,
                  reviews,
                  recipes: d.recipes.map((r) =>
                    r.id === recipe.id
                      ? {
                          ...r,
                          rating:
                            Math.round(
                              (ratings.reduce((a, b) => a + b.stars, 0) /
                                ratings.length) *
                                10,
                            ) / 10,
                        }
                      : r,
                  ),
                };
              });
              setItem("");
              setMessage("Cảm ơn bạn đã chia sẻ!");
            }
          }}
        />
      </>
    );
  // Trang cá nhân: thông tin tài khoản, các mục của người dùng và đăng xuất.
  else if (page === "profile")
    body = (
      <>
        <View style={{ alignItems: "center", padding: 25 }}>
          <View
            style={{
              backgroundColor: "#e3eddf",
              padding: 25,
              borderRadius: 60,
            }}
          >
            <UserRound size={45} color={green} />
          </View>
          <Text style={[s.title, { fontSize: 22 }]}>
            {account?.name || "Khách ghé thăm"}
          </Text>
          <Text style={s.muted}>
            {account?.email || "Đăng nhập để lưu hành trình nấu ăn"}
          </Text>
          <Text style={[s.section, { fontSize: 15 }]}>
            {data.recipes.filter((r) => r.author === account?.name).length} Công
            thức · {data.favorites.length} Yêu thích
          </Text>
        </View>
        {[
          ["Công thức của tôi", "mine"],
          ["Món yêu thích", "favorites"],
          ["Danh sách mua sắm", "shopping"],
          ...(account ? [["Đổi mật khẩu", "change-password"]] : []),
          ...(isAdmin ? [["Trang quản trị", "admin"]] : []),
        ].map(([label, path]) => (
          <Pressable
            accessibilityRole="button"
            key={path}
            style={[s.panel, s.row]}
            onPress={() => go(path)}
          >
            <Text style={s.name}>{label}</Text>
            <ChevronRight color={green} size={18} />
          </Pressable>
        ))}
        <Button
          secondary
          title={account ? "Đăng xuất" : "Đăng nhập"}
          disabled={authBusy}
          onPress={async () => {
            if (!account) {
              router.push("/login");
              return;
            }
            setAuthBusy(true);
            try {
              await commitSession(null);
              router.replace("/login");
            } catch {
              setMessage(
                "Không lưu được trạng thái đăng xuất. Vui lòng thử lại.",
              );
            } finally {
              setAuthBusy(false);
            }
          }}
        />
      </>
    );
  // Thông tin tác giả, nút theo dõi và danh sách công thức của tác giả.
  else if (page === "author")
    body = (
      <>
        <View style={{ alignItems: "center", padding: 20 }}>
          <ChefHat size={70} color={green} />
          <Text style={s.title}>
            {params.id ? recipe.author : "Trần Thị Mai"}
          </Text>
          <Text style={s.muted}>Yêu căn bếp nhỏ, thích những bữa cơm nhà.</Text>
          <Text style={s.section}>
            {1200 + (data.following ? 1 : 0)} người theo dõi
          </Text>
          <Button
            title={data.following ? "Đang theo dõi ✓" : "Theo dõi tác giả"}
            onPress={() => setData((d) => ({ ...d, following: !d.following }))}
          />
        </View>
        <Text style={s.section}>Công thức của tác giả</Text>
        {list(
          approved.filter(
            (r) => r.author === (params.id ? recipe.author : "Trần Thị Mai"),
          ),
        )}
      </>
    );
  else if (
    ["admin", "moderation", "manage", "users"].includes(page) &&
    !isAdmin
  )
    body = (
      <View style={s.panel}>
        <ShieldCheck color={green} size={50} />
        <Text style={s.title}>Khu vực quản trị</Text>
        <Text style={s.muted}>
          Đăng nhập bằng tài khoản quản trị để tiếp tục.
        </Text>
        <Button title="Đăng nhập Admin" onPress={() => go("login")} />
      </View>
    );
  // Tổng quan Admin: thống kê và các lối vào quản lý công thức/người dùng.
  else if (page === "admin")
    body = (
      <>
        <Text style={s.title}>Xin chào, Admin!</Text>
        <Text style={s.muted}>Cùng chăm chút cộng đồng Bếp Việt mỗi ngày.</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {[
            ["Công thức", data.recipes.length, "manage"],
            [
              "Chờ duyệt",
              data.recipes.filter((r) => r.status === "pending").length,
              "moderation",
            ],
            [
              "Bị từ chối",
              data.recipes.filter((r) => r.status === "rejected").length,
              "manage",
            ],
            ["Người dùng", data.accounts.length, "users"],
          ].map(([label, count, path]) => (
            <Pressable
              accessibilityRole="button"
              key={String(label)}
              onPress={() =>
                router.push({
                  pathname: `/${path}` as any,
                  params:
                    label === "Chờ duyệt" || label === "Bị từ chối"
                      ? { filter: String(label) }
                      : {},
                })
              }
              style={[s.panel, { width: "47%", minHeight: 125 }]}
            >
              <ShieldCheck color={green} />
              <Text style={s.title}>{count}</Text>
              <Text style={s.muted}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.section}>Cần bạn xem xét</Text>
        {list(data.recipes.filter((r) => r.status === "pending"))}
        <Button
          secondary
          title="Quản lý công thức"
          onPress={() => go("manage")}
        />
        <Button
          secondary
          title="Quản lý người dùng"
          onPress={() => go("users")}
        />
      </>
    );
  // Giao diện duyệt/quản lý: lọc công thức, duyệt hoặc từ chối món.
  else if (page === "moderation" || page === "manage")
    body = (
      <>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Tìm kiếm công thức..."
        />
        <Chips
          items={["Tất cả", "Chờ duyệt", "Đã duyệt", "Bị từ chối"]}
          value={filter}
          onChange={setFilter}
        />
        {data.recipes
          .filter(
            (r) =>
              normalize(r.name).includes(normalize(query)) &&
              (filter === "Tất cả" ||
                r.status ===
                  (
                    {
                      "Chờ duyệt": "pending",
                      "Đã duyệt": "approved",
                      "Bị từ chối": "rejected",
                    } as Record<string, string>
                  )[filter]),
          )
          .map((r) => (
            <View key={r.id} style={s.panel}>
              <RecipeCard recipe={r} compact />
              <Text style={s.muted}>
                Tác giả: {r.author} ·{" "}
                {{
                  pending: "Chờ duyệt",
                  approved: "Đã duyệt",
                  rejected: "Bị từ chối",
                }[r.status] || r.status}
              </Text>
              <View style={s.row}>
                <Button
                  title={r.status === "approved" ? "Đã duyệt" : "Duyệt"}
                  disabled={r.status === "approved"}
                  onPress={() => changeStatus(r.id, "approved")}
                />
                <Button
                  secondary
                  title={r.status === "rejected" ? "Đã từ chối" : "Từ chối"}
                  disabled={r.status === "rejected"}
                  onPress={() => changeStatus(r.id, "rejected")}
                />
              </View>
            </View>
          ))}
      </>
    );
  // Quản lý tài khoản: tìm người dùng và thay đổi trạng thái khóa tài khoản.
  else if (page === "users")
    body = (
      <>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Tìm kiếm người dùng..."
        />
        <Chips
          items={["Tất cả", "Đang hoạt động", "Bị khóa"]}
          value={filter}
          onChange={setFilter}
        />
        {data.accounts
          .filter(
            (a) =>
              normalize(a.name + " " + a.email).includes(normalize(query)) &&
              (filter === "Tất cả" ||
                (filter === "Bị khóa" ? a.blocked : !a.blocked)),
          )
          .map((a) => (
            <View key={a.email} style={s.panel}>
              <Text style={s.name}>{a.name}</Text>
              <Text style={s.muted}>
                {a.email} · {a.blocked ? "Bị khóa" : "Hoạt động"}
              </Text>
              {a.role !== "admin" && (
                <Button
                  secondary
                  title={a.blocked ? "Mở khóa" : "Khóa tài khoản"}
                  onPress={() =>
                    setData((d) => ({
                      ...d,
                      accounts: d.accounts.map((x) =>
                        x.email === a.email ? { ...x, blocked: !x.blocked } : x,
                      ),
                    }))
                  }
                />
              )}
            </View>
          ))}
      </>
    );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fcfaf3" }}>
      <View
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 520,
          alignSelf: "center",
          backgroundColor: "#fcfaf3",
        }}
      >
        {page !== "index" && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 20,
              paddingVertical: 15,
              gap: 14,
              borderBottomWidth: 1,
              borderColor: "#eeeee4",
            }}
          >
            {!["home", "search", "favorites", "profile", "admin"].includes(
              page,
            ) && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Quay lại"
                hitSlop={10}
                onPress={() => {
                  // Trang đăng nhập luôn quay về giới thiệu, không trở lại hồ sơ khách trong lịch sử.
                  if (page === "login") {
                    router.replace("/");
                    return;
                  }
                  if (page === "register") {
                    router.replace("/login");
                    return;
                  }
                  router.canGoBack()
                    ? router.back()
                    : router.replace(account ? "/home" : "/");
                }}
              >
                <ArrowLeft color={green} size={22} />
              </Pressable>
            )}
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: "#173d31",
                flex: 1,
              }}
            >
              {titles[page]}
            </Text>
            <ChefHat color={green} size={22} />
          </View>
        )}
        {Boolean(message || error) && (
          <View
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={[
              s.panel,
              {
                marginHorizontal: 20,
                backgroundColor: "#e3f2e7",
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              },
            ]}
          >
            <Text style={{ flex: 1, color: green, lineHeight: 23 }}>
              {message || error}
            </Text>
            {!!message && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng thông báo"
                hitSlop={10}
                onPress={() => setMessage("")}
              >
                <Text style={{ color: green, fontSize: 22 }}>×</Text>
              </Pressable>
            )}
          </View>
        )}
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: 20,
            paddingTop: page === "index" ? 16 : 20,
            paddingBottom: page === "index" ? 16 : 35,
            ...(page === "index" ? { flexGrow: 1 } : {}),
          }}
        >
          {!ready ? (
            <Text>Đang chuẩn bị căn bếp...</Text>
          ) : (
            <Animated.View
              entering={FadeInDown.duration(350)}
              style={page === "index" ? { flexGrow: 1 } : undefined}
            >
              {body}
            </Animated.View>
          )}
        </ScrollView>
        {!["index", "login", "register", "cooking", "editor"].includes(
          page,
        ) && (
          <View
            style={{
              flexDirection: "row",
              paddingVertical: 12,
              borderTopWidth: 1,
              borderColor: "#e3e8de",
              backgroundColor: "white",
            }}
          >
            {tabs.map(({ page: p, label, Icon }) => (
              <Pressable
                accessibilityRole="button"
                key={p}
                onPress={() => router.navigate(`/${p}` as any)}
                style={{ flex: 1, alignItems: "center", gap: 5 }}
              >
                <Icon color={page === p ? green : "#8d9b94"} size={21} />
                <Text
                  style={{
                    fontSize: 10,
                    color: page === p ? green : "#8d9b94",
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
      {webRecorderOpen && (
        <WebVideoRecorder
          onClose={() => setWebRecorderOpen(false)}
          onUse={(uri) => {
            setVideo(uri);
            setWebRecorderOpen(false);
            setMessage(
              "Đã dùng video vừa quay. Video trên trình duyệt chỉ dùng trong phiên hiện tại; tải lại trang cần quay hoặc chọn lại.",
            );
          }}
        />
      )}
      {cameraOpen && (
        <Modal visible={cameraOpen} onRequestClose={() => setCameraOpen(false)}>
          {cameraOpen && (
            <CameraView ref={camera} style={{ flex: 1 }} facing="back">
              <SafeAreaView
                style={{ flex: 1, justifyContent: "flex-end", padding: 25 }}
              >
                <Button
                  title="Chụp ảnh"
                  onPress={async () => {
                    try {
                      const p = await camera.current?.takePictureAsync();
                      if (p) setPhoto(p.uri);
                      setCameraOpen(false);
                    } catch {
                      setMessage("Không chụp được ảnh.");
                      setCameraOpen(false);
                    }
                  }}
                />
                <Button
                  title="Đóng camera"
                  secondary
                  onPress={() => setCameraOpen(false)}
                />
              </SafeAreaView>
            </CameraView>
          )}
        </Modal>
      )}
    </SafeAreaView>
  );
}
