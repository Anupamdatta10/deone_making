import tkinter as tk
import serial, time

print("Program started")

ser = serial.Serial("COM3", 115200, timeout=1)
print("Serial connection established")
time.sleep(2)


def send(motor, direction, speed):
    msg = f"M{motor},{direction},{speed}\n"
    print(f"Sending: {msg.strip()}")
    ser.write(msg.encode())


root = tk.Tk()
root.title("4 Motor Control")

for i in range(4):
    frame = tk.LabelFrame(root, text=f"Motor {i+1}")
    frame.pack(padx=10, pady=5, fill="x")

    speed = tk.Scale(
        frame,
        from_=0,
        to=255,
        orient=tk.HORIZONTAL,
        command=lambda val, i=i: send(i+1, "L", int(val))  # auto‑send on move
    )
    speed.set(0)
    speed.pack(side="left", padx=5)


    dir_var = tk.StringVar(value="L")  # default direction

    tk.Radiobutton(
        frame, text="Left", variable=dir_var, value="L",
        command=lambda s=speed, i=i, d=dir_var: send(i+1, d.get(), s.get())
    ).pack(side="left", padx=5)

    tk.Radiobutton(
        frame, text="Right", variable=dir_var, value="R",
        command=lambda s=speed, i=i, d=dir_var: send(i+1, d.get(), s.get())
    ).pack(side="left", padx=5)

root.mainloop()
