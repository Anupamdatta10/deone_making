#include <WiFi.h>
#include <WebServer.h>
#include <Wire.h>
#include <MPU6050.h>

// ---------------- WIFI ----------------
const char* ssid = "Anupam";
const char* password = "sankar1962";

WebServer server(80);

// ---------------- MOTOR PINS ----------------
// Motor 1
#define AIN1_1 33
#define AIN2_1 17   // CHANGED from 19 → 17
#define PWM_1  32

// Motor 2
#define BIN1_1 25
#define BIN2_1 18
#define PWM_2  26

// Motor 3
#define AIN1_2 14
#define AIN2_2 23
#define PWM_3  27

// Motor 4
#define BIN1_2 12   // CHANGED from 12 → 13 (safe)
#define BIN2_2 22
#define PWM_4  13

// ---------------- MPU6050 ----------------
#define SDA_PIN 21
#define SCL_PIN 19

MPU6050 mpu;

// ---------------- PWM ----------------
#define PWM_FREQ 1000
#define PWM_RES 8

void setupPWM() {
  ledcAttach(PWM_1, PWM_FREQ, PWM_RES);
  ledcAttach(PWM_2, PWM_FREQ, PWM_RES);
  ledcAttach(PWM_3, PWM_FREQ, PWM_RES);
  ledcAttach(PWM_4, PWM_FREQ, PWM_RES);
}

// ---------------- PIN SETUP ----------------
void setupPins() {
  pinMode(AIN1_1, OUTPUT);
  pinMode(AIN2_1, OUTPUT);
  pinMode(BIN1_1, OUTPUT);
  pinMode(BIN2_1, OUTPUT);

  pinMode(AIN1_2, OUTPUT);
  pinMode(AIN2_2, OUTPUT);
  pinMode(BIN1_2, OUTPUT);
  pinMode(BIN2_2, OUTPUT);
}

// ---------------- KALMAN FILTER ----------------
float angle = 0, bias = 0;
float P[2][2] = {{1, 0}, {0, 1}};
float Q_angle = 0.001;
float Q_bias = 0.003;
float R_measure = 0.03;

float kalmanFilter(float newAngle, float newRate, float dt) {
  angle += dt * (newRate - bias);

  P[0][0] += dt * (dt*P[1][1] - P[0][1] - P[1][0] + Q_angle);
  P[0][1] -= dt * P[1][1];
  P[1][0] -= dt * P[1][1];
  P[1][1] += Q_bias * dt;

  float S = P[0][0] + R_measure;
  float K[2];
  K[0] = P[0][0] / S;
  K[1] = P[1][0] / S;

  float y = newAngle - angle;

  angle += K[0] * y;
  bias += K[1] * y;

  float P00_temp = P[0][0];
  float P01_temp = P[0][1];

  P[0][0] -= K[0] * P00_temp;
  P[0][1] -= K[0] * P01_temp;
  P[1][0] -= K[1] * P00_temp;
  P[1][1] -= K[1] * P01_temp;

  return angle;
}

// ---------------- MPU READ ----------------
float lastTime = 0;

float getFilteredAngle() {
  int16_t ax, ay, az, gx, gy, gz;

  mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);

  float accAngle = atan2(ay, az) * 180 / PI;
  float gyroRate = gx / 131.0;

  float now = millis();
  float dt = (now - lastTime) / 1000.0;
  lastTime = now;

  return kalmanFilter(accAngle, gyroRate, dt);
}

// ---------------- MOTOR CONTROL ----------------
void controlMotor(int motor, String dir, int speed) {
  speed = constrain(speed, 0, 255);

  switch (motor) {
    case 1:
      digitalWrite(AIN1_1, dir == "L");
      digitalWrite(AIN2_1, dir == "R");
      ledcWrite(PWM_1, speed);
      break;

    case 2:
      digitalWrite(BIN1_1, dir == "L");
      digitalWrite(BIN2_1, dir == "R");
      ledcWrite(PWM_2, speed);
      break;

    case 3:
      digitalWrite(AIN1_2, dir == "L");
      digitalWrite(AIN2_2, dir == "R");
      ledcWrite(PWM_3, speed);
      break;

    case 4:
      digitalWrite(BIN1_2, dir == "L");
      digitalWrite(BIN2_2, dir == "R");
      ledcWrite(PWM_4, speed);
      break;
  }
}

// ---------------- HTTP HANDLERS ----------------
void handleControl() {
  if (!server.hasArg("motor") || !server.hasArg("dir") || !server.hasArg("speed")) {
    server.send(400, "text/plain", "Missing params");
    return;
  }

  int motor = server.arg("motor").toInt();
  String dir = server.arg("dir");
  int speed = server.arg("speed").toInt();

  controlMotor(motor, dir, speed);

  server.send(200, "text/plain", "OK");
}

void handleGyro() {
  float ang = getFilteredAngle();
  server.send(200, "text/plain", String(ang));
}

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(115200);

  setupPins();
  setupPWM();

  // MPU6050 init
  Wire.begin(SDA_PIN, SCL_PIN);
  mpu.initialize();

  if (mpu.testConnection()) {
    Serial.println("MPU6050 connected");
  } else {
    Serial.println("MPU6050 FAILED");
  }

  // WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConnected!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  server.on("/control", handleControl);
  server.on("/gyro", handleGyro);

  server.begin();
}

// ---------------- LOOP ----------------
void loop() {
  server.handleClient();
}