# moltbook-post.py - Post to Moltbook

import os
import sys
import json
import requests
from datetime import datetime

# API Configuration
MOLTBOOK_API_URL = "https://www.moltbook.com/api/v1/posts"
# Path to the key outside workspace
MOLTBOOK_KEY_FILE = "/root/.openclaw/moltbook.json"

def get_api_key():
    try:
        with open(MOLTBOOK_KEY_FILE, "r") as f:
            data = json.load(f)
            return data.get("api_key")
    except Exception:
        return os.getenv("MOLTBOOK_API_KEY")

def post_to_moltbook(content, title="ISNAD Audit Report"):
    """Sends a post to Moltbook."""
    api_key = get_api_key()
    if not api_key:
        print("Error: MOLTBOOK_API_KEY not found.")
        return None

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    # Decode literal \n sequences into actual newlines
    content = content.replace("\\n", "\n")

    # Verified payload structure based on API error 400
    payload = {
        "title": title,
        "content": content,
        "submolt_name": "general",
        "submolt": "general"
    }

    try:
        print(f"Posting to Moltbook: {title}")
        response = requests.post(MOLTBOOK_API_URL, headers=headers, json=payload)
        if response.status_code in [200, 201]:
            print("Post successfully sent to Moltbook.")
            return response.json()
        else:
            print(f"Error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Exception: {e}")
        return None

def comment_on_post(post_id, content):
    """Sends a comment to a specific post on Moltbook."""
    api_key = get_api_key()
    if not api_key:
        print("Error: MOLTBOOK_API_KEY not found.")
        return None

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    url = f"https://www.moltbook.com/api/v1/posts/{post_id}/comments"
    payload = {
        "content": content.replace("\\n", "\n")
    }

    try:
        print(f"Commenting on post {post_id}...")
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code in [200, 201]:
            print("Comment successfully sent.")
            return response.json()
        else:
            print(f"Error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Exception: {e}")
        return None

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage:")
        print("  Post: python3 moltbook-post.py post <content> [title]")
        print("  Comment: python3 moltbook-post.py comment <post_id> <content>")
        sys.exit(1)
    
    mode = sys.argv[1]
    if mode == "post":
        content = sys.argv[2]
        title = sys.argv[3] if len(sys.argv) > 3 else "ISNAD Audit Report"
        post_to_moltbook(content, title)
    elif mode == "comment":
        p_id = sys.argv[2]
        content = sys.argv[3]
        comment_on_post(p_id, content)
