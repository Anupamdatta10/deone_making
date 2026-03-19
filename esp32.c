#include <WiFi.h>
#include <WebServer.h>

// WiFi credentials
const char* ssid = "Anupam";
const char* password = "sankar1962";

WebServer server(80);

// ---------------- MOTOR PINS ----------------
#define AIN1_1 33
#define AIN2_1 19
#define PWM_1  32

#define BIN1_1 25
#define BIN2_1 18
#define PWM_2  26

#define AIN1_2 14
#define AIN2_2 23
#define PWM_3  27

#define BIN1_2 12
#define BIN2_2 22
#define PWM_4  13

#define STBY1 4
#define STBY2 2

// PWM channels
#define PWM_FREQ 1000
#define PWM_RES 8

void setupPWM() {
  ledcAttach(PWM_1, PWM_FREQ, PWM_RES);
  ledcAttach(PWM_2, PWM_FREQ, PWM_RES);
  ledcAttach(PWM_3, PWM_FREQ, PWM_RES);
  ledcAttach(PWM_4, PWM_FREQ, PWM_RES);

  // ledcSetup(1, PWM_FREQ, PWM_RES);
  // ledcAttachPin(PWM_2, 1);

  // ledcSetup(2, PWM_FREQ, PWM_RES);
  // ledcAttachPin(PWM_3, 2);

  // ledcSetup(3, PWM_FREQ, PWM_RES);
  // ledcAttachPin(PWM_4, 3);
}

void setupPins() {
  pinMode(AIN1_1, OUTPUT);
  pinMode(AIN2_1, OUTPUT);
  pinMode(BIN1_1, OUTPUT);
  pinMode(BIN2_1, OUTPUT);

  pinMode(AIN1_2, OUTPUT);
  pinMode(AIN2_2, OUTPUT);
  pinMode(BIN1_2, OUTPUT);
  pinMode(BIN2_2, OUTPUT);

  pinMode(STBY1, OUTPUT);
  pinMode(STBY2, OUTPUT);

  digitalWrite(STBY1, HIGH); // Enable driver
  digitalWrite(STBY2, HIGH);
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

  Serial.printf("Motor %d Dir %s Speed %d\n", motor, dir.c_str(), speed);
}

// ---------------- HTTP HANDLER ----------------
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

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(115200);

  setupPins();
  setupPWM();

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConnected!");
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());

  server.on("/control", handleControl);
  server.begin();
}

// ---------------- LOOP ----------------
void loop() {
  server.handleClient();
}