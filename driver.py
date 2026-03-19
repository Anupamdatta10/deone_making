import tkinter as tk
import serial, time
import requests

ser = None
mode = None
esp_ip = None

def connect():
    global ser, mode, esp_ip

    mode = mode_var.get()

    if mode == "serial":
        port = port_entry.get()
        try:
            ser = serial.Serial(port, 115200, timeout=1)
            time.sleep(2)
            status_label.config(text="✅ Serial Connected")
        except Exception as e:
            status_label.config(text=f"❌ Serial Error: {e}")
            ser = None

    elif mode == "wifi":
        esp_ip = ip_entry.get()
        status_label.config(text=f"✅ WiFi Mode ({esp_ip})")


def send(motor, direction, speed):
    msg = f"M{motor},{direction},{speed}"
    print("Sending:", msg)

    if mode == "serial":
        if ser:
            ser.write((msg + "\n").encode())
        else:
            print("No serial connection")

    elif mode == "wifi":
        try:
            url = f"http://{esp_ip}/control"
            requests.get(url, params={
                "motor": motor,
                "dir": direction,
                "speed": speed
            }, timeout=1)
        except Exception as e:
            print("WiFi error:", e)


# ---------- UI ----------
root = tk.Tk()
root.title("4 Motor Control")

# Mode selection
top_frame = tk.LabelFrame(root, text="Connection")
top_frame.pack(fill="x", padx=10, pady=5)

mode_var = tk.StringVar(value="serial")

tk.Radiobutton(top_frame, text="Serial", variable=mode_var, value="serial").pack(side="left")
tk.Radiobutton(top_frame, text="WiFi", variable=mode_var, value="wifi").pack(side="left")

# Serial input
port_entry = tk.Entry(top_frame)
port_entry.insert(0, "COM3")
port_entry.pack(side="left", padx=5)

# WiFi input
ip_entry = tk.Entry(top_frame)
ip_entry.insert(0, "192.168.1.100")
ip_entry.pack(side="left", padx=5)

# Connect button
tk.Button(top_frame, text="Connect", command=connect).pack(side="left", padx=5)

status_label = tk.Label(top_frame, text="Not connected")
status_label.pack(side="left", padx=10)


# Motors UI
for i in range(4):
    frame = tk.LabelFrame(root, text=f"Motor {i+1}")
    frame.pack(padx=10, pady=5, fill="x")

    speed = tk.Scale(
        frame,
        from_=0,
        to=255,
        orient=tk.HORIZONTAL,
        command=lambda val, i=i: send(i+1, "L", int(val))
    )
    speed.set(0)
    speed.pack(side="left", padx=5)

    dir_var = tk.StringVar(value="L")

    tk.Radiobutton(
        frame, text="Left", variable=dir_var, value="L",
        command=lambda s=speed, i=i, d=dir_var: send(i+1, d.get(), s.get())
    ).pack(side="left", padx=5)

    tk.Radiobutton(
        frame, text="Right", variable=dir_var, value="R",
        command=lambda s=speed, i=i, d=dir_var: send(i+1, d.get(), s.get())
    ).pack(side="left", padx=5)

root.mainloop()
#192.168.31.186
