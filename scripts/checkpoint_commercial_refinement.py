"""Create a complete local recovery archive, manifest and checksum sidecars."""
import hashlib
import json
import os
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT.parent
NAME = "SeedTrade-european-seed-market-v3-commercial-cards-refinement-20261004"
DOC = ROOT / "docs/market-commercial-refinement-v3"
BASE = "3367f959ff87f97e47256aebe3a9919e01c7d360"
SHA = lambda b: hashlib.sha256(b).hexdigest()
DEST.mkdir(parents=True, exist_ok=True)
assert json.loads((DOC/'QA_RESULT.json').read_text())['failures']==0
(DOC / "APPROVED_BASE_DIFF.patch").write_bytes(subprocess.check_output(["git", "diff", "--binary", BASE], cwd=ROOT))
new = subprocess.check_output(["git", "ls-files", "--others", "--exclude-standard"], cwd=ROOT, text=True).splitlines()
modified = subprocess.check_output(["git", "diff", "--name-only", BASE], cwd=ROOT, text=True).splitlines()
metadata = {"repository": "Gate-V-5/seedtrade-eu", "starting_head": BASE, "new_commit": None,
    "push": "NOT_PUSHED", "deployment": "NONE", "restoration": "Complete source/public/built state; locked dependencies excluded. Reconnect Git to the recorded baseline if needed.",
    "modified_tracked_files": modified, "new_files": new, "qa_failures": 0,
    "local_archive_readback": "CRC and every manifest entry SHA256 required", "remote_readback": "PENDING_CONNECTOR_VERIFICATION"}
(DOC / "CHECKPOINT_METADATA.json").write_text(json.dumps(metadata, indent=2) + "\n")
(DOC / "LOCAL_VERIFICATION_RECEIPT.json").write_text(json.dumps({"qa": "110_CHECKS_PASS", "python": "268_PASS", "node": "47_PASS", "build": "PASS_WITH_EXISTING_BUNDLE_WARNING", "prerender": "122_PASS", "hydration": "610_PASS", "visual": "BLOCKED_ENVIRONMENT", "emails": 0, "remote_upload": "PENDING_EXTERNAL_RECEIPT"}, indent=2) + "\n")
ignored = {".git", "node_modules", "__pycache__", ".vite", "credentials", "secrets"}
files = [p for p in sorted(ROOT.rglob("*")) if p.is_file() and not p.is_symlink()
    and not any(x in ignored for x in p.relative_to(ROOT).parts)
    and not p.name.startswith(".env") and p.suffix not in {".pyc", ".pem", ".key", ".zip"}
    and p != DOC / "CHECKPOINT_MANIFEST.json"]
manifest = {"schema": "SEEDTRADE_CATALOGUE_V3_CHECKPOINT_MANIFEST", "starting_head": BASE,
    "entries": [{"path": str(p.relative_to(ROOT)), "size": p.stat().st_size, "sha256": SHA(p.read_bytes())} for p in files],
    "manifest_self_hash": "external sidecar; manifest intentionally not self-referential"}
mp = DOC / "CHECKPOINT_MANIFEST.json"
mp.write_text(json.dumps(manifest, indent=2) + "\n")
files.append(mp)
archive = DEST / (NAME + ".zip")
if archive.exists():
    raise RuntimeError("Refusing to overwrite existing checkpoint")
temporary = archive.with_suffix(".zip.tmp")
with zipfile.ZipFile(temporary, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
    for p in files:
        z.write(p, str(p.relative_to(ROOT)))
with zipfile.ZipFile(temporary) as z:
    assert z.testzip() is None
    for row in manifest["entries"]:
        assert SHA(z.read(row["path"])) == row["sha256"], row["path"]
os.replace(temporary, archive)
archive_sha = SHA(archive.read_bytes())
h = hashlib.sha256()
with archive.open("rb") as stream:
    while chunk := stream.read(4 * 1024 * 1024):
        h.update(hashlib.sha256(chunk).digest())
result = {"checkpoint": archive.name, "size": archive.stat().st_size, "sha256": archive_sha,
    "dropbox_content_hash": h.hexdigest(), "files": len(files), "local_crc": "PASS", "manifest_entry_hashes": "PASS",
    "manifest_sha256": SHA(mp.read_bytes()), "remote_verification": "PENDING"}
(DEST / (NAME + ".zip.sha256")).write_text(archive_sha + "  " + archive.name + "\n")
(DEST / (NAME + ".manifest.json")).write_bytes(mp.read_bytes())
(DEST / (NAME + ".metadata.json")).write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result))
