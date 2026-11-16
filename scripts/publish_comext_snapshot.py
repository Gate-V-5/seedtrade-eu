"""Publish only a validated COMEXT JSON pair through the existing managed Git build.

Runs in the authorized main-branch Actions job after validation/tests/build.
No Hostinger, API, database or SMTP credentials are required. No force pushes.
"""
from pathlib import Path
import argparse,base64,hashlib,json,os,subprocess,time,urllib.request

FILES=('src/generated/trade_pulse_public.json','src/generated/public_data_manifest.json')
REPOSITORY='Gate-V-5/seedtrade-eu'

def load(path):return json.loads(Path(path).read_text(encoding='utf-8'))

def validate_pair(root,work):
    state=load(work/'refresh-state.json')
    pulse=load(root/FILES[0]);manifest=load(root/FILES[1])
    if state.get('status')!='VALIDATED' or state.get('applied_locally') is not True:
        raise ValueError('SOURCE_VALIDATION_REQUIRED')
    digest=hashlib.sha256((root/FILES[0]).read_bytes()).hexdigest()
    if manifest['datasets']['trade_pulse'].get('sha256')!=digest:
        raise ValueError('SNAPSHOT_MANIFEST_HASH_MISMATCH')
    period=pulse['latest_completed_period']
    if state.get('source_period')!=period or any(pulse['views'][key]['latest']['period']!=period for key in ('eu_internal_trade','eu_imports','eu_exports')):
        raise ValueError('PUBLICATION_PERIOD_MISMATCH')
    if pulse.get('classification')!='PUBLIC_SAFE' or pulse.get('source')!='Eurostat COMEXT DS-045409':
        raise ValueError('UNAPPROVED_SOURCE')
    if pulse.get('country_coverage',{}).get('validated') is not True or pulse['country_coverage']['period']!=period:
        raise ValueError('COUNTRY_COVERAGE_REQUIRED')
    if state.get('source_manifest_sha256')!=pulse.get('refresh',{}).get('source_manifest_sha256'):
        raise ValueError('SOURCE_EVIDENCE_BINDING_MISMATCH')
    return {'period':period,'snapshotSha256':digest,'manifestSha256':hashlib.sha256((root/FILES[1]).read_bytes()).hexdigest()}

def publish(root,work,expected,environment=None,run=subprocess.run):
    env=dict(os.environ if environment is None else environment)
    if env.get('GITHUB_REPOSITORY')!=REPOSITORY or env.get('GITHUB_REF')!='refs/heads/main' or env.get('GITHUB_SHA')!=expected:
        raise ValueError('AUTHORIZED_MAIN_BRANCH_CONTEXT_REQUIRED')
    proof=validate_pair(root,work)
    def git(*args,write=False):
        result=run(['git','-c','core.hooksPath='+os.devnull,'-C',str(root),*args],env=env,capture_output=True,text=True,timeout=150)
        if result.returncode:
            raise RuntimeError('GIT_OPERATION_FAILED:'+args[0]+':'+str(result.returncode))
        return result.stdout.strip()
    if git('rev-parse','HEAD')!=expected:
        raise ValueError('CHECKOUT_REVISION_DRIFT')
    if git('remote','get-url','origin')!=f'https://github.com/{REPOSITORY}':
        # checkout uses a .git suffix depending on runner configuration.
        if git('remote','get-url','origin')!=f'https://github.com/{REPOSITORY}.git':
            raise ValueError('UNEXPECTED_PUBLISH_REMOTE')
    if git('diff','--cached','--name-only'):
        raise ValueError('UNEXPECTED_PRESTAGED_FILES')
    changed=set(filter(None,git('diff','--name-only','--',*FILES).splitlines()))
    if not changed:
        return {'status':'NO_CHANGE','commit':expected,**proof}
    if changed!=set(FILES):
        raise ValueError('MATCHED_SNAPSHOT_PAIR_REQUIRED')
    token=env.get('GITHUB_TOKEN')
    if not token:
        raise ValueError('EXISTING_ACTIONS_TOKEN_REQUIRED')
    # Authentication stays in process environment, never command arguments/logs
    # or repository configuration. The token is scoped by Actions to this repo.
    env.update(GIT_TERMINAL_PROMPT='0',GIT_CONFIG_COUNT='1',
               GIT_CONFIG_KEY_0='http.https://github.com/.extraheader',
               GIT_CONFIG_VALUE_0='AUTHORIZATION: basic '+base64.b64encode(('x-access-token:'+token).encode()).decode())
    remote=git('ls-remote','--exit-code','origin','refs/heads/main').split()[0]
    if remote!=expected:
        raise ValueError('REMOTE_MAIN_ADVANCED_RETAIN_LAST_GOOD')
    git('add','--',*FILES)
    if set(git('diff','--cached','--name-only').splitlines())!=set(FILES):
        raise ValueError('PUBLICATION_ALLOWLIST_MISMATCH')
    git('-c','user.name=SEEDTRADE.EU Automation','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com',
        '-c','commit.gpgsign=false','commit','-m','Refresh validated COMEXT snapshot '+proof['period'])
    commit=git('rev-parse','HEAD')
    git('push','--porcelain','--no-follow-tags','--recurse-submodules=no','origin','HEAD:refs/heads/main')
    if git('ls-remote','--exit-code','origin','refs/heads/main').split()[0]!=commit:
        raise ValueError('PUBLICATION_REF_READBACK_FAILED')
    return {'status':'PUSHED_VALIDATED_PAIR_AWAIT_MANAGED_BUILD','commit':commit,'parent':expected,'files':list(FILES),**proof}

def verify_managed(root,receipt,attempts=90,pause=10,fetch=None):
    # Existing public/assets compatibility files are intentionally retained.
    # Select the active compiled chunk from the current build manifest rather
    # than mistaking those historical assets for multiple current snapshots.
    build=load(root/'dist/.vite/manifest.json')
    assets=[root/'dist'/entry['file'] for entry in build.values()
            if entry.get('name')=='trade_pulse_public' and entry.get('file','').endswith('.js')]
    if len(assets)!=1:
        raise ValueError('ONE_VALIDATED_PULSE_ASSET_REQUIRED')
    asset=assets[0]
    if asset.parent.resolve()!=(root/'dist/assets').resolve() or not asset.name.startswith('trade_pulse_public-'):
        raise ValueError('INVALID_MANAGED_PULSE_ASSET_PATH')
    expected=hashlib.sha256(asset.read_bytes()).hexdigest()
    expected_page=hashlib.sha256((root/'dist/trade-pulse/index.html').read_bytes()).hexdigest()
    def retrieve(url):
        request=urllib.request.Request(url,headers={'User-Agent':'SEEDTRADE-Validated-Publication','Cache-Control':'no-cache','Accept-Encoding':'identity'})
        with urllib.request.urlopen(request,timeout=25) as response:
            return response.read()
    fetch=fetch or retrieve
    for attempt in range(attempts):
        try:
            content=fetch('https://seedtrade.eu/assets/'+asset.name)
            page_bytes=fetch('https://seedtrade.eu/trade-pulse?stage1_publication='+receipt['commit']);page=page_bytes.decode('utf-8')
            if hashlib.sha256(content).hexdigest()==expected and hashlib.sha256(page_bytes).hexdigest()==expected_page and page.count('data-aggregation="MONTH_ONLY"')==3 and receipt['period'] in page:
                return {'status':'PASS_MANAGED_PUBLICATION','commit':receipt['commit'],'asset':asset.name,'assetSha256':expected,'pageSha256':expected_page,'period':receipt['period']}
        except Exception:
            pass
        if attempt+1<attempts:time.sleep(pause)
    raise ValueError('MANAGED_PUBLICATION_NOT_CONFIRMED')

def restore_prior_pair(root,receipt):
    env=os.environ.copy()
    token=env.get('GITHUB_TOKEN')
    if not token:raise ValueError('ACTIONS_TOKEN_REQUIRED_FOR_PAIR_ROLLBACK')
    env.update(GIT_TERMINAL_PROMPT='0',GIT_CONFIG_COUNT='1',GIT_CONFIG_KEY_0='http.https://github.com/.extraheader',
               GIT_CONFIG_VALUE_0='AUTHORIZATION: basic '+base64.b64encode(('x-access-token:'+token).encode()).decode())
    def git(*args):
        q=subprocess.run(['git','-c','core.hooksPath='+os.devnull,'-C',str(root),*args],capture_output=True,env=env,timeout=150)
        if q.returncode:raise RuntimeError('PAIR_ROLLBACK_GIT_FAILED:'+args[0])
        return q.stdout
    if git('rev-parse','HEAD').decode().strip()!=receipt['commit'] or git('ls-remote','--exit-code','origin','refs/heads/main').decode().split()[0]!=receipt['commit']:
        raise ValueError('PAIR_ROLLBACK_STOPPED_REMOTE_DRIFT')
    for name in FILES:(root/name).write_bytes(git('show',receipt['parent']+':'+name))
    previous=load(root/FILES[1])
    if previous['datasets']['trade_pulse']['sha256']!=hashlib.sha256((root/FILES[0]).read_bytes()).hexdigest():
        raise ValueError('PRIOR_PAIR_HASH_MISMATCH')
    git('add','--',*FILES)
    if set(git('diff','--cached','--name-only').decode().splitlines())!=set(FILES):
        raise ValueError('PAIR_ROLLBACK_ALLOWLIST_MISMATCH')
    git('-c','user.name=SEEDTRADE.EU Automation','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com','-c','commit.gpgsign=false','commit','-m','Restore last-good COMEXT snapshot after unconfirmed managed publication')
    commit=git('rev-parse','HEAD').decode().strip()
    git('push','--porcelain','--no-follow-tags','--recurse-submodules=no','origin','HEAD:refs/heads/main')
    if git('ls-remote','--exit-code','origin','refs/heads/main').decode().split()[0]!=commit:
        raise ValueError('PAIR_ROLLBACK_REF_READBACK_FAILED')
    return {'status':'LAST_GOOD_PAIR_RESTORED_IN_MANAGED_SOURCE','commit':commit}

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1])
    parser.add_argument('--work',type=Path,default=Path('.cache/comext-refresh'))
    parser.add_argument('--expected-base',required=True)
    parser.add_argument('--wait-for-managed',action='store_true')
    a=parser.parse_args()
    result=publish(a.root.resolve(),a.work.resolve(),a.expected_base)
    if a.wait_for_managed and result['status']=='PUSHED_VALIDATED_PAIR_AWAIT_MANAGED_BUILD':
        try:
            result['managedPublication']=verify_managed(a.root.resolve(),result)
        except Exception as exc:
            result['managedPublication']={'status':'FAILED','reason':str(exc)}
            result['rollback']=restore_prior_pair(a.root.resolve(),result)
            print(json.dumps(result,indent=2))
            raise SystemExit(1)
    print(json.dumps(result,indent=2))
