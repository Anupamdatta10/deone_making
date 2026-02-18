import asyncio
import websockets
import json
import pygame
from pygame.locals import *
from OpenGL.GL import *
from OpenGL.GLU import *

# ---- Drone State ----
drone = {
    "pitch": 0,
    "roll": 0
}

# ---- WebSocket Server ----
async def ws_handler(websocket):
    print("ESP32 Connected")
    async for message in websocket:
        data = json.loads(message)
        drone["pitch"] = data.get("pitch", 0)
        drone["roll"] = data.get("roll", 0)

async def start_server():
    async with websockets.serve(ws_handler, "0.0.0.0", 8765):
        await asyncio.Future()

# ---- Draw Cube ----
def draw_cube(size):
    s = size / 2

    glBegin(GL_QUADS)

    # Front (Red)
    glColor3f(1, 0, 0)
    glVertex3f(-s, -s, s)
    glVertex3f(s, -s, s)
    glVertex3f(s, s, s)
    glVertex3f(-s, s, s)

    # Back (Green)
    glColor3f(0, 1, 0)
    glVertex3f(-s, -s, -s)
    glVertex3f(s, -s, -s)
    glVertex3f(s, s, -s)
    glVertex3f(-s, s, -s)

    # Left (Blue)
    glColor3f(0, 0, 1)
    glVertex3f(-s, -s, -s)
    glVertex3f(-s, -s, s)
    glVertex3f(-s, s, s)
    glVertex3f(-s, s, -s)

    # Right (Yellow)
    glColor3f(1, 1, 0)
    glVertex3f(s, -s, -s)
    glVertex3f(s, -s, s)
    glVertex3f(s, s, s)
    glVertex3f(s, s, -s)

    # Top (Cyan)
    glColor3f(0, 1, 1)
    glVertex3f(-s, s, -s)
    glVertex3f(-s, s, s)
    glVertex3f(s, s, s)
    glVertex3f(s, s, -s)

    # Bottom (Magenta)
    glColor3f(1, 0, 1)
    glVertex3f(-s, -s, -s)
    glVertex3f(-s, -s, s)
    glVertex3f(s, -s, s)
    glVertex3f(s, -s, -s)

    glEnd()

# ---- Draw Ground Grid ----
def draw_grid():
    glColor3f(0.3, 0.3, 0.3)
    glBegin(GL_LINES)
    for i in range(-10, 11):
        glVertex3f(i, -2, -10)
        glVertex3f(i, -2, 10)
        glVertex3f(-10, -2, i)
        glVertex3f(10, -2, i)
    glEnd()

# ---- Draw Drone ----
def draw_drone():
    glPushMatrix()

    glTranslatef(0, 0, -8)

    # Apply roll and pitch
    glRotatef(drone["roll"], 0, 0, 1)   # Roll
    glRotatef(drone["pitch"], 1, 0, 0)  # Pitch

    # Arms
    glLineWidth(4)
    glColor3f(1, 1, 1)
    glBegin(GL_LINES)
    glVertex3f(-2, 0, 0)
    glVertex3f(2, 0, 0)
    glVertex3f(0, -2, 0)
    glVertex3f(0, 2, 0)
    glEnd()

    # Square Body
    draw_cube(1.2)

    glPopMatrix()

# ---- Main Loop ----
async def main():
    pygame.init()
    display = (1000, 700)
    pygame.display.set_mode(display, DOUBLEBUF | OPENGL)

    gluPerspective(45, display[0] / display[1], 0.1, 50.0)
    glEnable(GL_DEPTH_TEST)

    glClearColor(0.1, 0.15, 0.25, 1)

    asyncio.create_task(start_server())

    clock = pygame.time.Clock()

    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                return

        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)

        draw_grid()
        draw_drone()

        pygame.display.flip()
        clock.tick(60)
        await asyncio.sleep(0)

asyncio.run(main())
