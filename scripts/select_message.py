#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Công cụ Python chọn tin nhắn cho AI Omnichannel Assistant
Cách sử dụng:
  1. python scripts/select_message.py "Nội dung tin nhắn"
  2. python scripts/select_message.py  (Tự động lấy văn bản đang có trong Clipboard)
  3. python scripts/select_message.py "Nội dung tin nhắn" "Tên người gửi"
"""

import sys
import json
import urllib.request
import urllib.error
import ctypes

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

API_URL = "http://127.0.0.1:45678/api/select-message"

def get_clipboard_text() -> str:
    """Đọc văn bản từ Windows Clipboard mà không cần cài thêm thư viện ngoài."""
    user32 = ctypes.windll.user32
    kernel32 = ctypes.windll.kernel32

    if not user32.OpenClipboard(None):
        return ""
    try:
        CF_UNICODETEXT = 13
        h_glb = user32.GetClipboardData(CF_UNICODETEXT)
        if not h_glb:
            return ""
        ptr = kernel32.GlobalLock(h_glb)
        if not ptr:
            return ""
        try:
            return ctypes.c_wchar_p(ptr).value or ""
        finally:
            kernel32.GlobalUnlock(h_glb)
    finally:
        user32.CloseClipboard()

def send_message_to_app(message_text: str, contact_name: str = "Hội thoại đang mở", platform: str = "messenger"):
    payload = {
        "message": message_text,
        "contact": contact_name,
        "platform": platform
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        API_URL,
        data=data,
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=3) as resp:
            body = resp.read().decode("utf-8")
            res_json = json.loads(body)
            if res_json.get("success"):
                print(f"[THÀNH CÔNG] Đã gửi tin nhắn sang AI Copilot:")
                print(f"  + Người gửi: {contact_name}")
                print(f"  + Nội dung : \"{message_text}\"")
                print(f"  -> AI đang tự động tạo 3 phương án gợi ý trên giao diện App!")
                return True
            else:
                print(f"[THẤT BẠI] Phản hồi từ App: {body}")
                return False
    except urllib.error.URLError as e:
        print(f"[LỖI KẾT NỐI] Không thể kết nối tới App tại {API_URL}.")
        print(f"Chi tiết: {e}")
        print("Vui lòng đảm bảo App AI Omnichannel Assistant đang mở!")
        return False

def main():
    contact = "Hội thoại đang mở"
    if len(sys.argv) >= 2:
        msg = sys.argv[1].strip()
        if len(sys.argv) >= 3:
            contact = sys.argv[2].strip()
    else:
        print("Không có tham số đầu vào, đang đọc từ Clipboard...")
        msg = get_clipboard_text().strip()
        if not msg:
            print("[THÔNG BÁO] Clipboard đang trống. Hãy copy văn bản tin nhắn hoặc truyền nội dung vào lệnh:")
            print("  Ví dụ: python scripts/select_message.py \"Chào shop giá bao nhiêu\"")
            return

    send_message_to_app(msg, contact)

if __name__ == "__main__":
    main()
