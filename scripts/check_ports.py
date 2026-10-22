import socket
import urllib.request

ip1 = "172.16.100.215"
ip2 = "172.16.100.43"

for port in [80, 5000, 8899, 8080, 554]:
    s = socket.socket()
    s.settimeout(0.5)
    r = s.connect_ex((ip1, port))
    s.close()
    print(f"Cam1 ({ip1}) port {port}: {'OPEN' if r == 0 else 'CLOSED'}")

for port in [80, 5000, 8899, 8080, 554]:
    s = socket.socket()
    s.settimeout(0.5)
    r = s.connect_ex((ip2, port))
    s.close()
    print(f"Cam2 ({ip2}) port {port}: {'OPEN' if r == 0 else 'CLOSED'}")
