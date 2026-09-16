#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Công cụ Python giám sát & quản lý Auto-Reply:
Cách sử dụng:
  1. python scripts/auto_reply_monitor.py --list
     (Xem danh sách các cuộc trò chuyện đã tích bật Auto-Reply)
  2. python scripts/auto_reply_monitor.py --reply "Quang Huy" "kê"
     (Kích hoạt Auto-Reply cho Quang Huy với nội dung 'kê')
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

STATUS_URL = "http://127.0.0.1:45678/api/status"
CONTACTS_URL = "http://127.0.0.1:45678/api/contacts"
TRIGGER_URL = "http://127.0.0.1:45678/api/trigger-incoming"

def list_contacts():
    try:
        with urllib.request.urlopen(CONTACTS_URL, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            global_on = data.get("globalAutoReply")
            contacts = data.get("contacts", [])
            print("==================================================================")
            print(f"  TRẠNG THÁI AUTO-REPLY TỔNG: {'[ĐANG BẬT]' if global_on else '[ĐÃ TẮT]'}")
            print(f"  Tổng số liên hệ trong cơ sở dữ liệu: {len(contacts)}")
            print("==================================================================")
            ticked = [c for c in contacts if c.get("autoReplyEnabled")]
            unticked = [c for c in contacts if not c.get("autoReplyEnabled")]

            print("\n[DANH SÁCH ĐÃ TÍCH BẬT AUTO-REPLY]:")
            if not ticked:
                print("  (Chưa có liên hệ nào được tích)")
            for c in ticked:
                print(f"  ✓ {c.get('name')} | Nhóm: {c.get('category')} | Persona: {c.get('personaId')}")

            print("\n[DANH SÁCH CHƯA TÍCH (THỦ CÔNG)]:")
            for c in unticked:
                print(f"  - {c.get('name')} | Nhóm: {c.get('category')}")
    except Exception as e:
        print(f"[LỖI] Không thể kết nối tới App: {e}")

def trigger_reply(contact: str, message: str):
    payload = {"contact": contact, "message": message, "platform": "messenger"}
    req = urllib.request.Request(
        TRIGGER_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            res_json = json.loads(resp.read().decode("utf-8"))
            if res_json.get("success"):
                print(f"[THÀNH CÔNG] Đã kích hoạt Auto-Reply cho '{contact}': \"{message}\"")
            else:
                print(f"[THẤT BẠI] {res_json}")
    except Exception as e:
        print(f"[LỖI] {e}")

def main():
    if len(sys.argv) >= 2 and sys.argv[1] == "--list":
        list_contacts()
    elif len(sys.argv) >= 4 and sys.argv[1] == "--reply":
        trigger_reply(sys.argv[2], sys.argv[3])
    else:
        print("Cách sử dụng:")
        print("  python scripts/auto_reply_monitor.py --list")
        print("  python scripts/auto_reply_monitor.py --reply \"Quang Huy\" \"kê\"")
        list_contacts()

if __name__ == "__main__":
    main()
