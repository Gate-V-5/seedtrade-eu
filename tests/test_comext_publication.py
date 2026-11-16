import hashlib,json,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import Mock
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import publish_comext_snapshot as p

class PublicationGate(unittest.TestCase):
    def fixture(self,root):
        work=root/'work';work.mkdir()
        pulse={'latest_completed_period':'2026-08','classification':'PUBLIC_SAFE','source':'Eurostat COMEXT DS-045409',
               'views':{key:{'latest':{'period':'2026-08'}} for key in ('eu_internal_trade','eu_imports','eu_exports')},
               'country_coverage':{'period':'2026-08','validated':True},'refresh':{'source_manifest_sha256':'synthetic-only'}}
        for name,value in [(p.FILES[0],pulse),('work/refresh-state.json',{'status':'VALIDATED','applied_locally':True,'source_period':'2026-08','source_manifest_sha256':'synthetic-only'})]:
            target=root/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(json.dumps(value),encoding='utf-8')
        manifest={'datasets':{'trade_pulse':{'sha256':hashlib.sha256((root/p.FILES[0]).read_bytes()).hexdigest()}}}
        (root/p.FILES[1]).write_text(json.dumps(manifest),encoding='utf-8')
        return work

    def test_invalid_data_never_reaches_git_or_publication(self):
        folder=ROOT/'tmp';folder.mkdir(exist_ok=True)
        for fault in ('FAILED','HASH','PERIOD','EVIDENCE'):
            with tempfile.TemporaryDirectory(dir=folder) as name:
                root=Path(name);work=self.fixture(root)
                if fault=='HASH':(root/p.FILES[0]).write_text('{}')
                else:
                    path=work/'refresh-state.json';state=json.loads(path.read_text())
                    state['status' if fault=='FAILED' else 'source_period' if fault=='PERIOD' else 'source_manifest_sha256']='INVALID'
                    path.write_text(json.dumps(state))
                run=Mock()
                with self.assertRaises((ValueError,KeyError)):
                    p.publish(root,work,'approved',{'GITHUB_REPOSITORY':p.REPOSITORY,'GITHUB_REF':'refs/heads/main','GITHUB_SHA':'approved'},run=run)
                run.assert_not_called()

    def test_valid_pair_and_branch_boundary(self):
        folder=ROOT/'tmp';folder.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=folder) as name:
            root=Path(name);work=self.fixture(root)
            self.assertEqual(p.validate_pair(root,work)['period'],'2026-08')
            run=Mock()
            with self.assertRaisesRegex(ValueError,'AUTHORIZED_MAIN_BRANCH_CONTEXT_REQUIRED'):
                p.publish(root,work,'approved',{'GITHUB_REPOSITORY':p.REPOSITORY,'GITHUB_REF':'refs/heads/unrelated','GITHUB_SHA':'approved'},run=run)
            run.assert_not_called()

    def test_managed_handoff_requires_exact_new_asset_and_monthly_page(self):
        folder=ROOT/'tmp';folder.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=folder) as name:
            root=Path(name);assets=root/'dist/assets';assets.mkdir(parents=True)
            (assets/'trade_pulse_public-fixture.js').write_bytes(b'synthetic fixture asset')
            (assets/'trade_pulse_public-stale-compatibility.js').write_bytes(b'old compatibility asset')
            (root/'dist/.vite').mkdir()
            (root/'dist/.vite/manifest.json').write_text(json.dumps({'_trade_pulse_public-fixture.js':{'name':'trade_pulse_public','file':'assets/trade_pulse_public-fixture.js'}}))
            (root/'dist/trade-pulse').mkdir()
            (root/'dist/trade-pulse/index.html').write_bytes(b'2026-08 '+b'data-aggregation="MONTH_ONLY" '*3)
            def fetch(url):
                return b'synthetic fixture asset' if '/assets/' in url else b'2026-08 '+b'data-aggregation="MONTH_ONLY" '*3
            receipt={'commit':'synthetic','period':'2026-08'}
            self.assertEqual(p.verify_managed(root,receipt,attempts=1,pause=0,fetch=fetch)['status'],'PASS_MANAGED_PUBLICATION')
            with self.assertRaisesRegex(ValueError,'MANAGED_PUBLICATION_NOT_CONFIRMED'):
                p.verify_managed(root,receipt,attempts=1,pause=0,fetch=lambda url:b'synthetic fixture asset' if '/assets/' in url else b'old page 2026-08 '+b'data-aggregation="MONTH_ONLY" '*3)
            with self.assertRaisesRegex(ValueError,'MANAGED_PUBLICATION_NOT_CONFIRMED'):
                p.verify_managed(root,receipt,attempts=1,pause=0,fetch=lambda url:b'old bytes')

if __name__=='__main__':unittest.main()
