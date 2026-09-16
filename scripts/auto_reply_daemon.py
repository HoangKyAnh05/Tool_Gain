#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Công cụ Python Watchdog giám sát và kích hoạt Auto-Reply liên tục:
Cách sử dụng:
  1. Chạy giám sát trạng thái:
     python scripts/auto_reply_daemon.py
  2. Kích hoạt Auto-Reply cho một người cụ thể:
     python scripts/auto_reply_daemon.py --reply "Quang Huy" "kê"
     python scripts/auto_reply_daemon.py --reply "MotorHola Team" "Gõ đầu Ya"
  3. Chuyển sang đoạn chat của ai đó:
     python scripts/auto_reply_daemon.py --switch "Tino Trọng"
"""

import sys
import time
import json
import urllib.request
import urllib.error

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_URL = "http://127.0.0.1:45678"

def get_ticked_contacts():
    url = f"{BASE_URL}/api/contacts"
    try:
        with urllib.request.urlopen(url, timeout=4) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            contacts = data.get("contacts", [])
            ticked = [c for c in contacts if c.get("autoReplyEnabled")]
            return data.get("globalAutoReply", True), ticked, contacts
    except Exception as e:
        return None, [], []

def trigger_reply(contact: str, message: str):
    url = f"{BASE_URL}/api/trigger-incoming"
    payload = {
        "contact": contact,
        "message": message,
        "platform": "messenger"
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            if res.get("success"):
                reply_resp = res.get("replyResponse", {})
                suggested = reply_resp.get("suggestedReplies", [])
                print(f"[THÀNH CÔNG] Đã kích hoạt Auto-Reply cho '{contact}': \"{message}\"")
                for i, s in enumerate(suggested, 1):
                    print(f"  Option {i}: {s}")
                return True
    except Exception as e:
        print(f"[LỖI] {e}")
    return False

def switch_chat(contact: str):
    url = f"{BASE_URL}/api/switch-chat"
    payload = {"contactName": contact}
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            if res.get("success"):
                print(f"[THÀNH CÔNG] Đã chuyển sang chat: \"{contact}\"")
                return True
    except Exception as e:
        print(f"[LỖI] {e}")
    return False

def print_dashboard():
    global_on, ticked, all_c = get_ticked_contacts()
    print("==================================================================")
    print("   AI OMNICHANNEL ASSISTANT - AUTO-REPLY WATCHDOG (PYTHON)")
    print("==================================================================")
    if global_on is None:
        print("[!] Không thể kết nối tới App. Vui lòng mở App trước!")
        return
    print(f"Trạng thái Auto-Reply Tổng : {'[ĐANG BẬT]' if global_on else '[ĐÃ TẮT]'}")
    print(f"Số liên hệ đã tích bật     : {len(ticked)} / {len(all_c)}")
    print("------------------------------------------------------------------")
    for c in ticked:
        print(f"  ✓ {c.get('name'):<25} | Nhóm: {c.get('category'):<10} | Persona: {c.get('personaId')}")
    print("==================================================================")
    print("Các lệnh nhanh:")
    print("  python scripts/auto_reply_daemon.py --reply \"Quang Huy\" \"kê\"")
    print("  python scripts/auto_reply_daemon.py --switch \"MotorHola Team\"")
    print("  python scripts/send_message.py \"Chào bạn!\"")

def main():
    if len(sys.argv) >= 4 and sys.argv[1] == "--reply":
        trigger_reply(sys.argv[2], sys.argv[3])
    elif len(sys.argv) >= 3 and sys.argv[1] == "--switch":
        switch_chat(sys.argv[2])
    else:
        print_dashboard()

if __name__ == "__main__":
    main()
