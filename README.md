# AI Omnichannel Assistant (Zalo • Messenger • Telegram)

Ứng dụng Desktop cao cấp xây dựng bằng **Electron + React + TypeScript + Vite + Tailwind CSS**, tích hợp **Google Gemini API** (2.0 Flash / 1.5 Flash / 1.5 Pro) và **Local Database** để tự động hóa và hỗ trợ tương tác, trả lời tin nhắn đa kênh cho **Khách hàng**, **Nhân viên**, và **Bạn bè**.

---

## ✨ Tính Năng Nổi Bật

### 1. 🌐 Đa Nền Tảng Chat Trực Tiếp (Multi-Channel Webviews)
- Nhúng trực tiếp **Zalo Web** (`chat.zalo.me`), **Facebook Messenger** (`messenger.com`), và **Telegram Web** (`web.telegram.org`).
- Mỗi kênh chạy trong **Partition session độc lập và an toàn** (`persist:zalo`, `persist:messenger`, `persist:telegram`), lưu giữ trạng thái đăng nhập riêng biệt không bao giờ bị xung đột.
- Tự động bắt tin nhắn mới đến thông qua cơ chế Injected DOM Mutation Observer.

### 2. ⚡ Chế Độ Tương Tác Kép Thông Minh (Hybrid: Auto-Reply & Copilot)
- **Tự động gửi (Auto-Reply)**: Trả lời tự động sau thời gian đếm ngược ngẫu nhiên (3 - 6 giây) kèm thanh tiến trình an toàn và nút **"Hủy gửi"** tức thì.
- **Trợ lý đồng hành (Copilot)**: Hiển thị thanh Dock bên cạnh với **3 phương án trả lời** (Ngắn gọn, Chi tiết, Thân thiện/Hài hước) cho người dùng duyệt và bấm **"Gửi ngay"** hoặc chỉnh sửa trong 1 cú click.

### 3. 🎭 Hệ Thống Đa Persona (Multi-Persona Studio)
- **Khách hàng (Customer Support & Sales)**: Giọng văn lịch sự, ân cần, dạ vâng chuẩn mực, tư vấn chính xác dựa trên tài liệu FAQ, bảng giá.
- **Nhân viên (Employee & Task Management)**: Ngắn gọn, rõ ràng, tập trung vào công việc, phân công nhiệm vụ và nhắc nhở tiến độ.
- **Bạn bè (Friend & Casual)**: Tự nhiên, hài hước, xưng hô thân mật, phong cách Gen Z đời thường.
- Dễ dàng tạo thêm các Persona tùy biến và chỉnh sửa System Prompt, Temperature, thời gian đếm ngược.

### 4. 📚 Kho Tri Thức Cục Bộ (Knowledge Base / RAG FAQ)
- Quản lý danh mục câu hỏi thường gặp, chính sách ship, đổi trả, bảo hành, bảng giá sản phẩm.
- Tích hợp bộ **RAG Search Tester** giúp kiểm tra ngay độ khớp tài liệu đối với từng câu hỏi của khách.

### 5. 👥 Quản Lý Danh Bạ & Gán Nhãn Đối Tượng
- Tự động nhận diện và gán nhãn từng người chat.
- Cho phép tùy biến Persona, ghi chú riêng và bật/tắt Auto-reply độc lập cho từng người.

### 6. 🧪 Phòng Lab Mô Phỏng Đa Kịch Bản (Interactive Sandbox Simulator)
- Thử nghiệm ngay lập tức các kịch bản chat thực tế mà không cần đăng nhập tài khoản thật.

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Khởi chạy ở chế độ phát triển (Development)
```bash
# Cài đặt dependencies (nếu chưa cài)
npm install

# Khởi chạy ứng dụng Electron Dev
npm run dev
```

### 2. Cấu hình Google Gemini API Key
1. Vào mục **Cài Đặt & API Key** trên thanh Menu bên trái.
2. Lấy API Key miễn phí tại [Google AI Studio](https://aistudio.google.com/app/apikey).
3. Dán mã API Key và bấm **"Kiểm tra kết nối"** -> Bấm **"Lưu tất cả thiết lập"**.

### 3. Đóng gói ứng dụng (Build Production)
```bash
npm run build
```

---

## 📂 Cấu Trúc Mã Nguồn

```
├── electron/
│   ├── main.ts               # Quản lý vòng đời Electron, Partition session, IPC Handlers
│   ├── preload.ts            # ContextBridge an toàn giao tiếp với React UI
│   ├── webview-preload.ts    # Script inject vào DOM Zalo, Messenger, Telegram
│   ├── db/
│   │   ├── database.ts       # Quản trị dữ liệu Local Database (CRUD)
│   │   └── defaultData.ts    # Dữ liệu Persona, FAQ mẫu ban đầu
│   ├── services/
│   │   ├── gemini.ts         # Tích hợp Google Gemini API & Smart Fallback
│   │   ├── autoReply.ts      # Điều phối hàng đợi đếm ngược và tự động gửi
│   │   └── contextEngine.ts  # Đối soát tri thức RAG & tổng hợp Prompt
│   └── types.ts              # Định nghĩa cấu trúc dữ liệu
├── src/
│   ├── components/
│   │   ├── TopHeader.tsx          # Thanh tiêu đề, trạng thái AI & công tắc Auto-reply
│   │   ├── Sidebar.tsx            # Menu điều hướng đa kênh
│   │   ├── WorkspaceView.tsx      # Nhúng Webview và tích hợp Copilot
│   │   ├── CopilotSidebar.tsx     # Thanh đề xuất 3 phương án trả lời AI & đếm ngược
│   │   ├── ChatSimulatorView.tsx  # Môi trường giả lập Sandbox
│   │   ├── PersonaManager.tsx     # Trình quản lý Persona Studio
│   │   ├── KnowledgeBaseView.tsx  # Trình quản lý FAQ & RAG Tester
│   │   ├── ContactsView.tsx       # Quản lý danh bạ & gán nhãn
│   │   ├── AnalyticsLogsView.tsx  # Nhật ký và thống kê tương tác
│   │   └── SettingsView.tsx       # Cấu hình API Key & mô hình Gemini
│   ├── context/
│   │   └── AppContext.tsx         # State management toàn cục
│   ├── App.tsx                    # Điều hướng giao diện
│   └── main.tsx                   # React Entrypoint
├── package.json
└── vite.config.ts
```

---

## 🔒 Bảo Mật & Lưu Trữ Cục Bộ
- Toàn bộ danh bạ, cấu hình Persona, kịch bản FAQ và nhật ký trò chuyện được lưu trữ cục bộ 100% trên máy tính của bạn (`AppData/userData`), đảm bảo quyền riêng tư và an toàn dữ liệu.
