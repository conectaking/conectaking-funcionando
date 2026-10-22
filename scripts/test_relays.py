import urllib.request

xml = '''<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tds="http://www.onvif.org/ver10/device/wsdl">
  <soap:Body>
    <tds:GetRelayOutputs />
  </soap:Body>
</soap:Envelope>'''

for ip, port in [('172.16.100.215', 5000), ('172.16.100.43', 80)]:
    try:
        req = urllib.request.Request(f'http://{ip}:{port}/onvif/device_service', data=xml.encode(), headers={'Content-Type': 'application/soap+xml'})
        with urllib.request.urlopen(req, timeout=3) as res:
            print(f"Relay Outputs for {ip}:{port}:\n", res.read().decode())
    except Exception as e:
        print(f"Relay error {ip}:{port}:", e)
