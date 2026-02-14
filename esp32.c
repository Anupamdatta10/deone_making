#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

WebSocketsClient webSocket;

const char* ssid = "Anupam";
const char* password = "sankar1962";

// ===== RENDER SETTINGS =====
// Example: https://drone-sim.onrender.com
// Write ONLY the domain (no https)
const char* host = "deone-making.onrender.com";  
const uint16_t port = 443;   // HTTPS port

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {

  switch(type) {

    case WStype_CONNECTED:
      Serial.println("Connected to Render Server");
      break;

    case WStype_DISCONNECTED:
      Serial.println("Disconnected from Server");
      break;

    case WStype_TEXT:

      Serial.print("Raw: ");
      Serial.println((char*)payload);

      DynamicJsonDocument doc(256);
      DeserializationError error = deserializeJson(doc, payload);

      if (error) {
        Serial.println("JSON Parse Failed");
        return;
      }

      float leftX  = doc["leftX"];
      float leftY  = doc["leftY"];
      float rightX = doc["rightX"];
      float rightY = doc["rightY"];

      Serial.print("Left  -> X: "); Serial.print(leftX);
      Serial.print("  Y: "); Serial.println(leftY);

      Serial.print("Right -> X: "); Serial.print(rightX);
      Serial.print("  Y: "); Serial.println(rightY);

      Serial.println("----------------------------");
      break;
  }
}

void setup() {

  Serial.begin(115200);

  WiFi.begin(ssid, password);
  Serial.print("Connecting WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi Connected");

  // ===== SECURE CONNECTION (WSS) =====
  webSocket.beginSSL(host, port, "/esp32");
  webSocket.onEvent(webSocketEvent);

  // Optional: auto reconnect every 5 sec
  webSocket.setReconnectInterval(5000);
}

void loop() {
  webSocket.loop();
}
