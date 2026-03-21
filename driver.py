import tkinter as tk
import serial, time
import requests

ser = None
mode = None
esp_ip = None

# ---------------- CONNECT ----------------
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


# ---------------- SEND MOTOR DATA ----------------
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
            }, timeout=0.5)
        except Exception as e:
            print("WiFi error:", e)


# ---------------- UI ----------------
root = tk.Tk()
root.title("4 Motor Control + Gyro")
root.geometry("700x700")

# ---------- CONNECTION ----------
top_frame = tk.LabelFrame(root, text="Connection")
top_frame.pack(fill="x", padx=10, pady=5)

mode_var = tk.StringVar(value="wifi")

tk.Radiobutton(top_frame, text="Serial", variable=mode_var, value="serial").pack(side="left")
tk.Radiobutton(top_frame, text="WiFi", variable=mode_var, value="wifi").pack(side="left")

port_entry = tk.Entry(top_frame)
port_entry.insert(0, "COM3")
port_entry.pack(side="left", padx=5)

ip_entry = tk.Entry(top_frame)
ip_entry.insert(0, "192.168.31.186")
ip_entry.pack(side="left", padx=5)

tk.Button(top_frame, text="Connect", command=connect).pack(side="left", padx=5)

status_label = tk.Label(top_frame, text="Not connected")
status_label.pack(side="left", padx=10)


# ---------- MOTOR CONTROLS ----------
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


# ---------- GYRO GRAPH ----------
graph_frame = tk.LabelFrame(root, text="Gyro Angle (Flight Style)")
graph_frame.pack(padx=10, pady=10, fill="both", expand=True)

canvas_width = 650
canvas_height = 250

canvas = tk.Canvas(graph_frame, width=canvas_width, height=canvas_height, bg="black")
canvas.pack()

gyro_values = []

def fetch_gyro():
    global gyro_values

    if mode == "wifi" and esp_ip:
        try:
            url = f"http://{esp_ip}/gyro"
            res = requests.get(url, timeout=0.5)
            angle = float(res.text)

            gyro_values.append(angle)

            if len(gyro_values) > 120:
                gyro_values.pop(0)

            draw_graph()

        except Exception as e:
            print("Gyro error:", e)

    root.after(100, fetch_gyro)


def draw_graph():
    canvas.delete("all")

    if len(gyro_values) < 2:
        return

    max_angle = 90
    min_angle = -90

    scale_y = canvas_height / (max_angle - min_angle)

    # center (0° line)
    y_center = canvas_height / 2
    canvas.create_line(0, y_center, canvas_width, y_center, fill="red", dash=(4, 2))

    # draw graph
    for i in range(1, len(gyro_values)):
        x1 = (i - 1) * (canvas_width / 120)
        y1 = canvas_height - ((gyro_values[i - 1] - min_angle) * scale_y)

        x2 = i * (canvas_width / 120)
        y2 = canvas_height - ((gyro_values[i] - min_angle) * scale_y)

        canvas.create_line(x1, y1, x2, y2, fill="lime", width=2)

    # show latest angle
    canvas.create_text(
        60, 20,
        fill="white",
        text=f"{gyro_values[-1]:.2f}°",
        font=("Arial", 16, "bold")
    )


# start loop
fetch_gyro()

root.mainloop()
#192.168.31.186