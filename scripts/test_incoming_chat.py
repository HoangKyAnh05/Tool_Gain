#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Công cụ Python kích hoạt/kiểm tra Auto-Reply cho một cuộc trò chuyện:
Cách sử dụng:
  python scripts/test_incoming_chat.py "Quang Huy" "kê"
  python scripts/test_incoming_chat.py "MotorHola Team" "Shop có mẫu mới chưa"
"""

import sys
import json
import urllib.request
import urllib.error

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

API_URL = "http://127.0.0.1:45678/api/trigger-incoming"

def main():
    contact = "Quang Huy"
    message = "kê"
    platform = "messenger"

    if len(sys.argv) >= 2:
        contact = sys.argv[1].strip()
    if len(sys.argv) >= 3:
        message = sys.argv[2].strip()
    if len(sys.argv) >= 4:
        platform = sys.argv[3].strip()

    payload = {
        "contact": contact,
        "message": message,
        "platform": platform
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        API_URL,
        data=data,
        headers={"Content-Type": "application/json"}
    )

    print(f"[*] Đang gửi tin nhắn giả lập từ '{contact}': \"{message}\" sang App...")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode("utf-8")
            res_json = json.loads(body)
            if res_json.get("success"):
                reply_resp = res_json.get("replyResponse", {})
                suggested = reply_resp.get("suggestedReplies", [])
                print(f"[THÀNH CÔNG] Đã kích hoạt Auto-Reply cho '{contact}'!")
                print(f"  + Persona: {reply_resp.get('persona', {}).get('name', 'Mặc định')}")
                print(f"  + 3 Gợi ý vừa tạo:")
                for i, s in enumerate(suggested, 1):
                    print(f"     {i}. {s}")
                print("\n  -> App đang tự động đếm ngược và gửi câu trả lời trực tiếp vào khung chat!")
            else:
                print(f"[THẤT BẠI] Lỗi từ App: {body}")
    except urllib.error.URLError as e:
        print(f"[LỖI KẾT NỐI] Không thể kết nối tới App tại {API_URL}: {e}")
        print("Vui lòng đảm bảo App AI Omnichannel Assistant đang mở!")

if __name__ == "__main__":
    main()
