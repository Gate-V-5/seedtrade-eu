import unittest,tempfile,zipfile
from pathlib import Path
from recovery import inventory,verify,snapshot,verify_zip

class RecoveryTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)/'project';self.root.mkdir()
        (self.root/'data').mkdir();(self.root/'data'/'raw.bin').write_bytes(bytes(range(256))*100)
        (self.root/'MASTER_STATE.json').write_text('{}')
        inventory(self.root)
    def test_complete_zip_roundtrip(self):
        z=Path(self.tmp.name)/'snapshot.zip';snapshot(self.root,z)
        self.assertEqual(verify_zip(z),2)
        restored=Path(self.tmp.name)/'restored'
        with zipfile.ZipFile(z) as f:f.extractall(restored)
        self.assertEqual(verify(restored),2)
    def test_tamper_detected(self):
        (self.root/'MASTER_STATE.json').write_text('{"changed":true}')
        with self.assertRaises(ValueError):verify(self.root)
    def test_missing_or_extra_file_detected(self):
        (self.root/'extra').write_text('x')
        with self.assertRaises(ValueError):verify(self.root)
    def test_secrets_file_rejected(self):
        (self.root/'.env').write_text('SYNTHETIC')
        with self.assertRaises(ValueError):inventory(self.root)
    def test_manifest_tamper_detected(self):
        (self.root/'SHA256SUMS.txt').write_text('invalid')
        with self.assertRaises(ValueError):verify(self.root)
    def test_archive_inside_project_rejected(self):
        with self.assertRaises(ValueError):snapshot(self.root,self.root/'bad.zip')
    def test_unsafe_archive_rejected(self):
        z=Path(self.tmp.name)/'bad.zip'
        with zipfile.ZipFile(z,'w') as f:f.writestr('../escape','x')
        with self.assertRaises(ValueError):verify_zip(z)

if __name__=='__main__':unittest.main()
