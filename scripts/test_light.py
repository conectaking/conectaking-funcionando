import urllib.request

for name, url in [("Cam1 (Bebê)", "http://172.16.100.215:5000/onvif/PTZ"), ("Cam2 (Sala)", "http://172.16.100.43:80/onvif/PTZ")]:
    soap = """<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <SendAuxiliaryCommand xmlns="http://www.onvif.org/ver20/ptz/wsdl">
      <ProfileToken>Profile_1</ProfileToken>
      <AuxiliaryData>LightOn</AuxiliaryData>
    </SendAuxiliaryCommand>
  </s:Body>
</s:Envelope>"""
    req = urllib.request.Request(url, data=soap.encode('utf-8'), headers={'Content-Type': 'application/soap+xml'})
    try:
        with urllib.request.urlopen(req, timeout=3) as res:
            print(f"{name} SendAuxiliaryCommand LightOn status:", res.status, res.read().decode())
    except Exception as e:
        print(f"{name} SendAuxiliaryCommand err:", e)
