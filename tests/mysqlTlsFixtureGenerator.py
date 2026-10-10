# Synthetic local test certificates only. Private keys are ephemeral and never archived.
import sys
from pathlib import Path
from datetime import datetime,timedelta,timezone
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes,serialization
from cryptography.hazmat.primitives.asymmetric import rsa
p=Path(sys.argv[1]);now=datetime.now(timezone.utc)
def ca(label):
 k=rsa.generate_private_key(public_exponent=65537,key_size=2048);n=x509.Name([x509.NameAttribute(NameOID.COMMON_NAME,label)])
 c=x509.CertificateBuilder().subject_name(n).issuer_name(n).public_key(k.public_key()).serial_number(x509.random_serial_number()).not_valid_before(now-timedelta(days=1)).not_valid_after(now+timedelta(days=30)).add_extension(x509.BasicConstraints(ca=True,path_length=None),True).sign(k,hashes.SHA256());return k,c
k,c=ca('SYNTHETIC LOCAL CA');(p/'ca.pem').write_bytes(c.public_bytes(serialization.Encoding.PEM));_,foreign=ca('UNTRUSTED SYNTHETIC CA');(p/'foreign.pem').write_bytes(foreign.public_bytes(serialization.Encoding.PEM))
for label,hostname,start,end in [('valid','srv505.hstgr.io',-1,30),('wrong','wrong.invalid',-1,30),('expired','srv505.hstgr.io',-10,-1),('future','srv505.hstgr.io',1,30)]:
 key=rsa.generate_private_key(public_exponent=65537,key_size=2048)
 cert=x509.CertificateBuilder().subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME,hostname)])).issuer_name(c.subject).public_key(key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(now+timedelta(days=start)).not_valid_after(now+timedelta(days=end)).add_extension(x509.SubjectAlternativeName([x509.DNSName(hostname)]),False).add_extension(x509.BasicConstraints(ca=False,path_length=None),True).sign(k,hashes.SHA256())
 (p/(label+'.pem')).write_bytes(cert.public_bytes(serialization.Encoding.PEM));(p/(label+'-key.pem')).write_bytes(key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()))
