#!/usr/bin/env python3
"""Download personal CI builds and sign on this Mac; never interrupt a running app."""
import base64
import fcntl
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import plistlib
import shutil
import subprocess
import tempfile
import zipfile

REPO = "EricGorokhovsky2009/t3code-personal"
IDENTITY = "671C14AE59C65BACBE517947AEF3D45187E9A858"
PRODUCT = "T3 Code (Personal).app"
TARGET = Path("/Applications") / PRODUCT
STATE = Path.home() / "Library/Application Support/T3 Personal Updater"
GH = "/opt/homebrew/bin/gh"


def command(*args):
    return subprocess.check_output(args, text=True, stderr=subprocess.STDOUT, timeout=1800 if "download" in args else 300).strip()


def validate_archive(archive, metadata):
    if Path(metadata["filename"]).name != metadata["filename"]:
        raise ValueError("Invalid artifact filename")
    if archive.stat().st_size != metadata["size"]:
        raise ValueError("Artifact size mismatch")
    digest = base64.b64encode(hashlib.sha512(archive.read_bytes()).digest()).decode()
    if digest != metadata["sha512"]:
        raise ValueError("Artifact checksum mismatch")
    with zipfile.ZipFile(archive) as bundle:
        for entry in bundle.infolist():
            path = PurePosixPath(entry.filename)
            if path.is_absolute() or ".." in path.parts or not path.parts or path.parts[0] != PRODUCT:
                raise ValueError("Artifact contains an unexpected path")
            if (entry.external_attr >> 16) & 0o170000 == 0o120000:
                target = bundle.read(entry).decode()
                if target.startswith("/"):
                    raise ValueError("Artifact contains an absolute symlink")
                components = list(path.parent.parts)
                for part in PurePosixPath(target).parts:
                    if part == "..":
                        if len(components) <= 1:
                            raise ValueError("Artifact symlink escapes the app")
                        components.pop()
                    elif part != ".":
                        components.append(part)


def running_app(target=TARGET):
    processes = command("/bin/ps", "-axo", "comm=")
    return any(line.strip().startswith(str(target / "Contents") + "/") for line in processes.splitlines())


def install_staged(staged, target=TARGET, is_running=running_app):
    if is_running(target):
        return False
    # Keep the old bundle until the new one is in place. Never stop a process.
    replacement = target.with_name(target.name + ".incoming")
    backup = target.with_name(target.name + ".previous")
    if replacement.exists():
        shutil.rmtree(replacement)
    shutil.copytree(staged, replacement, symlinks=True)
    if is_running(target):
        shutil.rmtree(replacement)
        return False
    if backup.exists():
        shutil.rmtree(backup)
    had_previous = target.exists()
    if had_previous:
        target.rename(backup)
    try:
        replacement.rename(target)
    except BaseException:
        if had_previous:
            backup.rename(target)
        raise
    return True


def write_json(path, value):
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(value))
    temporary.replace(path)


def update():
    STATE.mkdir(parents=True, exist_ok=True)
    with (STATE / "lock").open("w") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return
        installed_file = STATE / "installed.json"
        installed = json.loads(installed_file.read_text()) if installed_file.exists() else {}
        pending_file = STATE / "pending.json"
        staged = STATE / PRODUCT
        pending = json.loads(pending_file.read_text()) if pending_file.exists() else {}
        # Connector-delivered builds are already verified and signed on this Mac.
        # Finish their installation even when GitHub credentials are unavailable.
        if pending and staged.exists():
            if install_staged(staged):
                write_json(installed_file, pending)
                pending_file.unlink()
                shutil.rmtree(staged)
                print(f"Installed {pending['version']} at {TARGET}", flush=True)
            else:
                print("Update staged; waiting for the personal app to close", flush=True)
            return
        runs = json.loads(command(GH, "run", "list", "--repo", REPO, "--workflow", "personal-build.yml", "--branch", "personal", "--status", "success", "--limit", "1", "--json", "databaseId,headSha"))
        if not runs:
            print("No successful personal build is available yet", flush=True)
            return
        run = runs[0]
        run_id = run["databaseId"]
        if installed.get("runId") == run_id and TARGET.exists():
            return
        if pending.get("runId") != run_id or not staged.exists():
            artifacts = json.loads(command(GH, "api", f"repos/{REPO}/actions/runs/{run_id}/artifacts"))["artifacts"]
            available = [a for a in artifacts if a["name"].startswith("personal-mac-") and not a["expired"]]
            if len(available) != 1:
                raise ValueError("Expected exactly one personal Mac build artifact")
            with tempfile.TemporaryDirectory(dir=STATE) as directory:
                folder = Path(directory)
                command(GH, "run", "download", str(run_id), "--repo", REPO, "--name", available[0]["name"], "--dir", str(folder))
                metadata = json.loads((folder / "personal-update.json").read_text())
                archive = folder / metadata["filename"]
                validate_archive(archive, metadata)
                extracted = folder / "extracted"
                command("/usr/bin/ditto", "-x", "-k", str(archive), str(extracted))
                app = extracted / PRODUCT
                with (app / "Contents/Info.plist").open("rb") as handle:
                    info = plistlib.load(handle)
                if info["CFBundleIdentifier"] != "com.t3tools.t3code" or info["CFBundleShortVersionString"] != metadata["version"]:
                    raise ValueError("Unexpected app identity or version")
                command("/usr/bin/codesign", "--force", "--deep", "--sign", IDENTITY, "--preserve-metadata=entitlements,flags", str(app))
                command("/usr/bin/codesign", "--verify", "--deep", "--strict", str(app))
                if staged.exists():
                    shutil.rmtree(staged)
                shutil.move(str(app), staged)
                pending = {"runId": run_id, "version": metadata["version"], "commit": metadata["commit"]}
                write_json(pending_file, pending)
                print(f"Signed and staged {pending['version']}", flush=True)
        if install_staged(staged):
            write_json(installed_file, pending)
            pending_file.unlink(missing_ok=True)
            shutil.rmtree(staged)
            print(f"Installed {pending['version']} at {TARGET}", flush=True)
        else:
            print("Update staged; waiting for the personal app to close", flush=True)


if __name__ == "__main__":
    try:
        update()
    except Exception as error:
        print(f"Personal update failed; existing app retained: {error}", flush=True)
        raise SystemExit(1)
