#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Công cụ Python chuyển nhanh sang bất kỳ đoạn chat nào trong danh sách bên trái:
Cách sử dụng:
  python scripts/switch_chat.py "MotorHola Team"
  python scripts/switch_chat.py "Tino Trọng"
  python scripts/switch_chat.py "Quang Huy"
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

API_URL = "http://127.0.0.1:45678/api/switch-chat"

def main():
    if len(sys.argv) < 2:
        print("Vui lòng cung cấp tên người cần chuyển chat:")
        print("  Ví dụ: python scripts/switch_chat.py \"MotorHola Team\"")
        return

    contact = sys.argv[1].strip()
    payload = {"contactName": contact}

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        API_URL,
        data=data,
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            body = resp.read().decode("utf-8")
            res_json = json.loads(body)
            if res_json.get("success"):
                print(f"[THÀNH CÔNG] Đã yêu cầu App chuyển sang đoạn chat: \"{contact}\"!")
            else:
                print(f"[THẤT BẠI] Lỗi: {body}")
    except urllib.error.URLError as e:
        print(f"[LỖI KẾT NỐI] {e}")

if __name__ == "__main__":
    main()
