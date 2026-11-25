import json
import os
import sys
import ssl
import subprocess
import urllib.request
import urllib.error

ssl._create_default_https_context = ssl._create_unverified_context

def get_token():
    t = os.environ.get("GITHUB_TOKEN", "")
    if not t:
        try:
            out = subprocess.check_output(
                ["git", "credential", "fill"],
                input=b"protocol=https\nhost=github.com\n",
                stderr=subprocess.PIPE
            ).decode()
            for line in out.splitlines():
                if line.startswith("password="):
                    t = line.split("=", 1)[1].strip()
        except Exception:
            pass
    return t

TOKEN = get_token()
REPO = "Ayubshaik01/remix-of-remix-of-make-it-great"
APK_PATH = r"android/app/build/outputs/apk/release/app-release.apk"

headers = {
    "Authorization": f"token {TOKEN}",
    "User-Agent": "KisanAI-Release-Bot",
    "Accept": "application/vnd.github.v3+json",
}

def make_public():
    url = f"https://api.github.com/repos/{REPO}"
    data = json.dumps({"private": False}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={**headers, "Content-Type": "application/json"}, method="PATCH")
    try:
        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode())
            print(f"Repo visibility updated: private={res.get('private')}")
    except Exception as e:
        print(f"Error setting public: {e}")

def create_release():
    url = f"https://api.github.com/repos/{REPO}/releases"
    data = json.dumps({
        "tag_name": "v1.0.0",
        "target_commitish": "main",
        "name": "KisanAI Offline AI Android APK v1.0.0",
        "body": "Official production release of KisanAI on-device AI agricultural assistant APK for Android.",
        "draft": False,
        "prerelease": False,
    }).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={**headers, "Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode())
            print(f"Release created: {res.get('id')}")
            return res
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"Release lookup (status {e.code}): {body}")
        req_get = urllib.request.Request(f"https://api.github.com/repos/{REPO}/releases/tags/v1.0.0", headers=headers)
        with urllib.request.urlopen(req_get) as resp:
            return json.loads(resp.read().decode())

def upload_apk(release):
    assets = release.get("assets", [])
    for asset in assets:
        if asset.get("name") == "kisanai-offline-ai.apk":
            asset_id = asset.get("id")
            print(f"Deleting previous asset {asset_id} to upload fresh binary...")
            del_url = f"https://api.github.com/repos/{REPO}/releases/assets/{asset_id}"
            del_req = urllib.request.Request(del_url, headers=headers, method="DELETE")
            try:
                with urllib.request.urlopen(del_req) as del_resp:
                    print(f"Previous asset deleted successfully ({del_resp.status})")
            except Exception as e:
                print(f"Error deleting asset: {e}")

    upload_url_template = release.get("upload_url", "")
    upload_url = upload_url_template.split("{")[0] + "?name=kisanai-offline-ai.apk"
    print(f"Uploading APK to: {upload_url}")

    file_size = os.path.getsize(APK_PATH)
    print(f"APK file size: {file_size / (1024 * 1024):.2f} MB")

    upload_headers = {
        "Authorization": f"token {TOKEN}",
        "User-Agent": "KisanAI-Release-Bot",
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Length": str(file_size),
    }

    with open(APK_PATH, "rb") as f:
        data = f.read()

    req = urllib.request.Request(upload_url, data=data, headers=upload_headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        download_url = res.get("browser_download_url")
        print(f"SUCCESS! Direct APK Download URL:\n{download_url}")
        return download_url

if __name__ == "__main__":
    make_public()
    rel = create_release()
    dl = upload_apk(rel)
