import socket
import sys

def test_port():
    host = "hopper.proxy.rlwy.net"
    port = 26982
    print(f"Testing socket connection to {host}:{port}...")
    try:
        with socket.create_connection((host, port), timeout=10):
            print("Socket connection successful!")
    except Exception as e:
        print(f"Socket connection failed: {e}")

if __name__ == "__main__":
    test_port()
