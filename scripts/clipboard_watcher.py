#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tiến trình Python chạy ngầm theo dõi Clipboard (Clipboard Watcher):
Bất cứ khi nào bạn bôi đen và bấm Ctrl+C tin nhắn ở Messenger, Zalo, hay bất kỳ đâu,
tool này sẽ tự động bắt lấy và đưa ngay vào mục 'Tin nhắn đã chọn' trong App AI!
"""

import time
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

def send_message_to_app(message_text: str):
    payload = {
        "message": message_text,
        "contact": "Hội thoại đang mở",
        "platform": "messenger"
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        API_URL,
        data=data,
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=2) as resp:
            body = resp.read().decode("utf-8")
            res = json.loads(body)
            if res.get("success"):
                print(f"[ĐÃ BẮT TIN NHẮN] \"{message_text}\" -> Đã chuyển sang Copilot App!")
    except Exception as e:
        # App có thể chưa mở, im lặng chờ
        pass

def main():
    print("==================================================================")
    print("  AI Omnichannel Assistant - Clipboard Watcher Tool")
    print("  Đang lắng nghe Clipboard... Bất kỳ tin nhắn nào bạn copy (Ctrl+C)")
    print("  sẽ được tự động nạp sang AI Copilot để tạo 3 gợi ý ngay lập tức!")
    print("  Nhấn Ctrl+C trong cửa sổ này để dừng.")
    print("==================================================================")
    
    last_text = get_clipboard_text().strip()
    
    while True:
        try:
            time.sleep(0.4)
            current_text = get_clipboard_text().strip()
            if current_text and current_text != last_text:
                last_text = current_text
                # Bỏ qua nếu text quá dài (> 1000 ký tự) hoặc quá ngắn (< 2 ký tự) hoặc là URL
                if 2 <= len(current_text) <= 1000 and not current_text.startswith("http://") and not current_text.startswith("https://"):
                    send_message_to_app(current_text)
        except KeyboardInterrupt:
            print("\nĐã dừng Clipboard Watcher.")
            break
        except Exception as e:
            time.sleep(1)

if __name__ == "__main__":
    main()
