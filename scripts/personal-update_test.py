import base64
import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

spec = importlib.util.spec_from_file_location("updater", Path(__file__).with_name("personal-update.py"))
updater = importlib.util.module_from_spec(spec)
spec.loader.exec_module(updater)


class UpdateTests(unittest.TestCase):
    def archive(self, folder, name, symlink=None):
        archive = folder / "build.zip"
        with zipfile.ZipFile(archive, "w") as bundle:
            if symlink:
                entry = zipfile.ZipInfo(name)
                entry.external_attr = 0o120777 << 16
                bundle.writestr(entry, symlink)
            else:
                bundle.writestr(name, "app")
        metadata = {"filename": archive.name, "size": archive.stat().st_size, "sha512": base64.b64encode(hashlib.sha512(archive.read_bytes()).digest()).decode()}
        return archive, metadata

    def test_checksum_and_paths(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            archive, metadata = self.archive(folder, updater.PRODUCT + "/Contents/Info.plist")
            updater.validate_archive(archive, metadata)
            metadata["sha512"] = "wrong"
            with self.assertRaisesRegex(ValueError, "checksum"):
                updater.validate_archive(archive, metadata)
            for name, symlink in [("../outside", None), (updater.PRODUCT + "/escape", "../../outside"), (updater.PRODUCT + "/escape", "/outside")]:
                archive, metadata = self.archive(folder, name, symlink)
                with self.assertRaises(ValueError):
                    updater.validate_archive(archive, metadata)

    def test_waits_for_running_app_and_keeps_backup(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            target, staged = folder / "installed.app", folder / "staged.app"
            target.mkdir()
            staged.mkdir()
            (target / "version").write_text("old")
            (staged / "version").write_text("new")
            self.assertFalse(updater.install_staged(staged, target, lambda _: True))
            self.assertEqual((target / "version").read_text(), "old")
            self.assertTrue(updater.install_staged(staged, target, lambda _: False))
            self.assertEqual((target / "version").read_text(), "new")
            self.assertEqual((target.with_name(target.name + ".previous") / "version").read_text(), "old")

    def test_install_failure_restores_old_bundle(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            target, staged = folder / "installed.app", folder / "staged.app"
            target.mkdir()
            staged.mkdir()
            (target / "version").write_text("old")
            rename = Path.rename
            def fail_replacement(path, destination):
                if path.name.endswith(".incoming"):
                    raise OSError("injected installation failure")
                return rename(path, destination)
            with patch.object(Path, "rename", fail_replacement):
                with self.assertRaises(OSError):
                    updater.install_staged(staged, target, lambda _: False)
            self.assertEqual((target / "version").read_text(), "old")


if __name__ == "__main__":
    unittest.main()
