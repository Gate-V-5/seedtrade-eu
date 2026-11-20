#!/usr/bin/env python3
"""Owner invokes interactively. Never run by an agent or through a logged tool.

Uses existing provisioning, TOTP, runtime SQL grants and encrypted backup tools.
No public listener, new review authority, company account or affiliation claim.
"""
import getpass,importlib.util,json,os,pathlib,secrets,shutil,subprocess,sys
sys.dont_write_bytecode=True
BASE=pathlib.Path(__file__).resolve().parents[1]
PRIVATE=pathlib.Path('/root/seedtrade-admin-enrollment-20261120')
KEY=pathlib.Path('/etc/seedtrade-production/admin-enrollment.env')

def protected(path):
    s=path.lstat()
    if path.is_symlink() or s.st_uid!=0 or s.st_mode&0o077:raise ValueError()

def write_private(path,value):
    fd=os.open(str(path),os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
    with os.fdopen(fd,'w') as file:file.write(value)

def node_run(node,script,inputpath,env,expected):
    result=subprocess.run([node,str(BASE/'scripts'/script),str(inputpath)],env=env,stdin=subprocess.DEVNULL,capture_output=True,text=True,timeout=45)
    if result.returncode or result.stdout.strip()!=expected:raise ValueError()

def encrypted_recovery(current):
    # The existing backup remains encrypted to the existing off-server recovery key.
    spec=importlib.util.spec_from_file_location('existing_backup',current/'ops/backup.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    original=module.encrypt_snapshot
    def include_identity_key(source,archive,age,recipient):
        source=pathlib.Path(source)
        for live in [KEY,pathlib.Path('/etc/systemd/system/seedtrade-production.service.d/override.conf')]:
            target=source/'configuration'/live.relative_to('/')
            target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(live,target);os.chmod(target,0o600)
        for live in BASE.rglob('*'):
            if live.is_file() and not live.is_symlink() and 'node_modules' not in live.parts:
                target=source/'release/admin-preparation'/live.relative_to(BASE)
                target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(live,target);os.chmod(target,0o600)
        return original(source,archive,age,recipient)
    module.encrypt_snapshot=include_identity_key
    return module.create_production(current/'runtime/age/age','age17nyat4efydgsdfj4n8aamtvv8n2dy7dxccc5kpldvpw68emnlp5qc7de2k')

def main():
    if os.name!='posix' or os.getuid()!=0 or not sys.stdin.isatty() or sys.argv[1:] not in ([],['--confirm']):raise ValueError()
    confirm=sys.argv[1:]==['--confirm']
    PRIVATE.mkdir(mode=0o700,exist_ok=True);protected(PRIVATE)
    live=dict(line.split('=',1) for line in pathlib.Path('/etc/seedtrade-production/app.env').read_text().splitlines() if line and not line.startswith('#') and '=' in line)
    if live.get('B2B_ADMIN_MODE','disabled')!='disabled' or live.get('B2B_MARKETPLACE_MODE','disabled')!='disabled':raise ValueError()
    if input('Type ENROLL to prepare info@seedtrade.eu with NO company-review authority: ').strip()!='ENROLL':raise ValueError()
    password=getpass.getpass('Administrator password (hidden, at least 12 characters): ')
    if not 12<=len(password)<=1024:raise ValueError()
    if not confirm and password!=getpass.getpass('Repeat password (hidden): '):raise ValueError()
    current=pathlib.Path('/opt/seedtrade-production/current').resolve(strict=True)
    pid=subprocess.check_output(['systemctl','show','seedtrade-production.service','-p','MainPID','--value'],text=True).strip()
    node=str(pathlib.Path('/proc',pid,'exe').resolve(strict=True))
    output=PRIVATE/'admin-enrollment.json'
    if not confirm:
        if KEY.exists() or output.exists():raise ValueError()
        # Key/seed creation occurs ONLY when the real owner runs this interactive command.
        write_private(KEY,'B2B_ADMIN_MFA_KEY='+secrets.token_hex(32)+'\n')
    protected(KEY)
    key=KEY.read_text().strip().split('=',1)[1]
    env=os.environ.copy();env['B2B_ADMIN_MFA_KEY']=key
    if not confirm:
        inp=PRIVATE/'identity-input.json'
        data={'email':'info@seedtrade.eu','password':password,'ownerAuthorized':True,'enrollmentOnly':True,'ownerAuthorizationRef':'Owner private execution under 2026-11-20 identity-only enrollment authorization'}
        write_private(inp,json.dumps(data)+'\n')
        result=subprocess.run([node,str(BASE/'scripts/provision-first-platform-admin.mjs'),str(inp),str(output)],env=env,stdin=subprocess.DEVNULL,capture_output=True,text=True,timeout=45)
        if result.returncode or result.stdout.strip()!='IDENTITY_PROVISIONED_MFA_REQUIRED_REVIEW_DISABLED':raise ValueError()
        inp.unlink()  # Only this invocation's successfully consumed plaintext password input.
    protected(output)
    print('In a second private root SSH session, open '+str(output)+' and add its secret to your authenticator.')
    print('Issuer: SEEDTRADE.EU Administration; account: info@seedtrade.eu; SHA1; 6 digits; 30 seconds. Do not share the file or code.')
    otp=getpass.getpass('Current authenticator code (hidden): ')
    inp=PRIVATE/'confirmation-input.json'
    write_private(inp,json.dumps({'email':'info@seedtrade.eu','password':password,'otp':otp})+'\n')
    try:node_run(node,'confirm-admin-identity.mjs',inp,env,'MFA_ENROLLED_REVIEW_DISABLED')
    finally:inp.unlink()  # Temporary secret input created exclusively by this invocation.
    backup=encrypted_recovery(current)
    receipt={'status':'MFA_ENROLLED_REVIEW_DISABLED','permissions':[],'affiliationsDeclaredComplete':False,'backupArchive':backup['archive'],'backupSha256':backup['archiveSha256'],'authenticatedRecoveryReadback':'PENDING_OWNER_RECOVERY_COMPUTER','publicAdmin':'OFF','marketplace':'OFF'}
    write_private(PRIVATE/'enrollment-result.json',json.dumps(receipt,indent=2)+'\n')
    print('MFA_ENROLLED_REVIEW_DISABLED')
    print('Encrypted recovery snapshot created. Independent authenticated recovery readback remains pending; share only this status, never secrets.')

if __name__=='__main__':
    try:main()
    except (Exception,KeyboardInterrupt):
        print('PRIVATE_ENROLLMENT_STOPPED. Review remains disabled. Existing identity/key/output is retained; do not overwrite or rerun initial enrollment blindly. Use --confirm only after provisioning succeeded.',file=sys.stderr)
        sys.exit(1)
