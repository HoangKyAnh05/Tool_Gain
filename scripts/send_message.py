#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Công cụ Python gửi tin nhắn trực tiếp vào khung chat đang mở trong App:
Cách sử dụng:
  python scripts/send_message.py "Dạ shop chào bạn, shop có thể hỗ trợ gì ạ?"
  python scripts/send_message.py "Quang Huy" "Anh có việc gì thế ạ?"
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

API_URL = "http://127.0.0.1:45678/api/send-message"

def main():
    if len(sys.argv) < 2:
        print("Vui lòng cung cấp nội dung tin nhắn cần gửi:")
        print("  Ví dụ: python scripts/send_message.py \"Dạ chào bạn!\"")
        print("  Hoặc:  python scripts/send_message.py \"Quang Huy\" \"Dạ chào anh!\"")
        return

    if len(sys.argv) == 2:
        contact = "Đoạn chat đang mở"
        text = sys.argv[1].strip()
    else:
        contact = sys.argv[1].strip()
        text = sys.argv[2].strip()

    payload = {
        "contact": contact,
        "text": text,
        "platform": "messenger"
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        API_URL,
        data=data,
        headers={"Content-Type": "application/json"}
    )

    print(f"[*] Đang gửi tin nhắn: \"{text}\" sang App...")
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            body = resp.read().decode("utf-8")
            res_json = json.loads(body)
            if res_json.get("success"):
                print(f"[THÀNH CÔNG] Đã gửi tin nhắn vào khung chat: \"{text}\"")
            else:
                print(f"[THẤT BẠI] Lỗi: {body}")
    except urllib.error.URLError as e:
        print(f"[LỖI KẾT NỐI] Không thể kết nối tới App: {e}")

if __name__ == "__main__":
    main()
