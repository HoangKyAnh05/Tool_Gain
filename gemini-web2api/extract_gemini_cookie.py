"""
Tool tự động trích xuất Cookie & Session từ trình duyệt Chrome / Edge để dùng cho gemini-web2api
"""
import os
import sys
import json
import re

def extract_cookies_manual():
    print("=" * 60)
    print("HƯỚNG DẪN LẤY COOKIE & XSRF TOKEN GEMINI NHANH NHẤT (CHỈ 30 GIÂY)")
    print("=" * 60)
    print("1. Trên trình duyệt Chrome đang mở Gemini (https://gemini.google.com):")
    print("2. Nhấn phím F12 (hoặc Chuột phải -> Inspect / Kiểm tra).")
    print("3. Chuyển sang tab 'Console', dán dòng lệnh sau và nhấn Enter:")
    print("-" * 60)
    js_snippet = """
(() => {
  const cookies = document.cookie;
  const snlm0e = window.WIZ_global_data?.SNlM0e || document.body.innerHTML.match(/"SNlM0e":"([^"]+)"/)?.[1] || "";
  const cfb2h = window.WIZ_global_data?.cfb2h || document.body.innerHTML.match(/"cfb2h":"([^"]+)"/)?.[1] || "";
  const authData = {
    cookie: cookies,
    xsrf_token: snlm0e,
    gemini_bl: cfb2h,
    auth_user: "0"
  };
  console.log("=== COPY TOÀN BỘ JSON DƯỚI ĐÂY ===");
  console.log(JSON.stringify(authData, null, 2));
  copy(JSON.stringify(authData, null, 2));
  alert("Đã tự động Copy JSON Session vào Clipboard của bạn!");
})()
    """
    print(js_snippet.strip())
    print("-" * 60)
    print("4. Khi chạy xong, script trên sẽ tự động COPY mã JSON vào bộ nhớ đệm (Clipboard).")
    print("5. Dán mã JSON đó vào đây (hoặc lưu vào file 'gemini-auth.json' trong thư mục gemini-web2api).")
    print("=" * 60)

def main():
    extract_cookies_manual()
    
    auth_file_path = os.path.join(os.path.dirname(__file__), "gemini-auth.json")
    config_file_path = os.path.join(os.path.dirname(__file__), "config.json")
    
    print("\nNhập chuỗi JSON bạn vừa copy (Nhấn Enter 2 lần khi nhập xong), hoặc gõ 'exit' để thoát:")
    lines = []
    while True:
        try:
            line = input()
            if not line and lines:
                break
            if line.strip().lower() == 'exit':
                return
            lines.append(line)
        except EOFError:
            break
            
    raw_input = "\n".join(lines).strip()
    if not raw_input:
        print("Không có dữ liệu được nhập.")
        return

    try:
        data = json.loads(raw_input)
        with open(auth_file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"\n[OK] Đã lưu thành công vào: {auth_file_path}")

        # Cập nhật config.json nếu có
        if os.path.exists(config_file_path):
            with open(config_file_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
        else:
            cfg = {
                "port": 8081,
                "host": "0.0.0.0",
                "default_model": "gemini-3.6-flash",
                "api_keys": ["sk-gemini"]
            }

        cfg["cookie_file"] = "gemini-auth.json"
        if data.get("xsrf_token"):
            cfg["xsrf_token"] = data["xsrf_token"]
        if data.get("gemini_bl"):
            cfg["gemini_bl"] = data["gemini_bl"]
        if data.get("auth_user"):
            cfg["auth_user"] = data["auth_user"]

        with open(config_file_path, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2, ensure_ascii=False)
        print(f"[OK] Đã cập nhật cấu hình: {config_file_path}")
        print("\n=> Bây giờ bạn có thể khởi động server bằng file 'start_gemini_server.bat'!")

    except Exception as e:
        print(f"[LỖI] Dữ liệu JSON không hợp lệ: {e}")

if __name__ == "__main__":
    main()
