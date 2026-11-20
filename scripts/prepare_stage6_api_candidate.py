"""Prepare local inputs only, using the established API archive and committed source.

No install, database, SMTP, deployment, activation or remote operation is performed.
"""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import zipfile

SOURCE = Path(__file__).resolve().parents[1]
BASE_SHA256 = '2e6e1d754bfe4fd82ae8a7f59a0d26d4901af1849a4c5314aeb819f90e183112'


def sha(value):
    return hashlib.sha256(value).hexdigest()


def git(*args):
    return subprocess.check_output(['git', '-C', str(SOURCE), *args])


def safe(name):
    p = PurePosixPath(name)
    return (not p.is_absolute() and '\\' not in name and ':' not in name
            and all(x not in ('..', '.', '.git', 'private', 'tmp', 'node_modules')
                    and not x.startswith('.env') and not x.endswith(('.key', '.pem', '.pfx', '.p12'))
                    for x in p.parts))


def prepare(base_api, output):
    base_api, output = Path(base_api).resolve(), Path(output).resolve()
    if sha(base_api.read_bytes()) != BASE_SHA256:
        raise ValueError('EXISTING_SEALED_API_ARCHIVE_MISMATCH')
    if output.exists() or not output.is_relative_to(SOURCE.parents[2]):
        raise ValueError('NEW_WORKSPACE_OUTPUT_DIRECTORY_REQUIRED')
    if git('diff', '--name-only').strip() or git('diff', '--cached', '--name-only').strip():
        raise ValueError('COMMITTED_CANDIDATE_REQUIRED')
    revision = git('rev-parse', 'HEAD').decode().strip()
    with zipfile.ZipFile(base_api) as archive:
        entries = {n: archive.read(n) for n in archive.namelist() if not n.endswith('/')}
    base_package, base_lock = entries['package.json'], entries['package-lock.json']
    paths = git('ls-tree', '-r', '--name-only', 'HEAD', 'server/b2b', 'shared').decode().splitlines()
    paths += ['server/runtimeMail.mjs', 'server/networkProxyPolicy.mjs',
              'scripts/provision-first-platform-admin.mjs', 'scripts/check_stage6_delivery.mjs']
    for name in paths:
        entries[name] = git('show', revision + ':' + name)
    entries['dist/data/crop-master-v1.json'] = git('show', revision + ':public/data/crop-master-v1.json')
    if any(not safe(n) for n in entries):
        raise ValueError('UNSAFE_ARCHIVE_ENTRY')
    # Validate literal relative imports in every runtime module, including shared terms.
    pattern = r'''(?:from\s*|import\s*(?:\(\s*)?)["']([^"']+)["']'''
    imports = 0
    for name, content in entries.items():
        if not name.endswith(('.mjs', '.js')):
            continue
        for specifier in re.findall(pattern, content.decode('utf-8-sig')):
            if not specifier.startswith('.'):
                continue
            parts = list(PurePosixPath(name).parent.parts)
            for part in PurePosixPath(specifier).parts:
                if part == '..':
                    if not parts:
                        raise ValueError('IMPORT_ESCAPES_PACKAGE')
                    parts.pop()
                elif part != '.':
                    parts.append(part)
            target = '/'.join(parts)
            if target not in entries:
                raise ValueError('MISSING_RUNTIME_IMPORT: ' + name + ' -> ' + target)
            imports += 1
    if entries['package.json'] != base_package or entries['package-lock.json'] != base_lock:
        raise ValueError('EXISTING_API_DEPENDENCIES_CHANGED')
    output.mkdir(parents=True)
    archive_path = output / 'api-source.zip'
    with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for name, content in sorted(entries.items()):
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, content)
    manifest = {'status': 'LOCAL_INPUTS_PREPARED_NOT_RELEASE_AUTHORIZATION',
                'revision': revision, 'baseApiSha256': BASE_SHA256,
                'apiSourceSha256': sha(archive_path.read_bytes()), 'relativeImportsVerified': imports,
                'dependenciesAndLockUnchanged': True, 'productionReady': False,
                'files': {n: sha(b) for n, b in sorted(entries.items())}}
    (output / 'API_INPUT_MANIFEST.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    return {k: v for k, v in manifest.items() if k != 'files'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-api', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    print(json.dumps(prepare(args.base_api, args.output)))
