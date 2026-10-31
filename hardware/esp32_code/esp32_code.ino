
#include <WiFi.h>
#include <PubSubClient.h>
#include "config.h" 

// 1. Wi-Fi credentials
const char* WIFI_SSID = my_WIFI_SSID;
const char* WIFI_PASSWORD = my_WIFI_PASSWORD;

// 2. MQTT broker settings
const char* MQTT_BROKER = my_MQTT_BROKER;
const int MQTT_PORT = my_MQTT_PORT;

const char* MQTT_USERNAME = my_MQTT_USERNAME;
const char* MQTT_PASSWORD = my_MQTT_PASSWORD;

// 3. MQTT topics
const char* LIGHT_SET_TOPIC =
    "smartlight/room1/light/set";

const char* LIGHT_STATE_TOPIC =
    "smartlight/room1/light/state";

// 4. Built-in LED
const int LED_PIN = 2;

// Most ESP32 Dev Module boards use HIGH for LED ON.
// Some board variants may use inverted logic.
const int LED_ON = HIGH;
const int LED_OFF = LOW;

// Create network and MQTT clients
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

bool ledState = false;


// Apply the LED state and report it through MQTT
void setLedState(bool turnOn) {
  digitalWrite(LED_PIN, turnOn ? LED_ON : LED_OFF);
  ledState = turnOn;

  const char* stateMessage = turnOn ? "ON" : "OFF";

  Serial.print("LED state changed to: ");
  Serial.println(stateMessage);

  // Report the actual commanded LED state to Node.js
  if (mqttClient.connected()) {
    mqttClient.publish(
      LIGHT_STATE_TOPIC,
      stateMessage,
      true
    );
  }
}


// Handle incoming MQTT commands
void mqttCallback(
    char* topic,
    byte* payload,
    unsigned int length
) {
  // Ignore messages from unrelated topics
  if (strcmp(topic, LIGHT_SET_TOPIC) != 0) {
    return;
  }

  // Convert the MQTT payload to text
  char message[16];
  if (length >= sizeof(message)) {
    Serial.println("MQTT command too long; ignored.");
    return;
  }

  memcpy(message, payload, length);
  message[length] = '\0';

  Serial.print("MQTT command received: ");
  Serial.println(message);

  if (strcmp(message, "ON") == 0) {
    setLedState(true);
  } else if (strcmp(message, "OFF") == 0) {
    setLedState(false);
  } else {
    Serial.println("Unknown command; ignored.");
  }
}


// Connect the ESP32 to Wi-Fi
void connectWiFi() {
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("Wi-Fi connected!");

  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());
  
  Serial.print("Gateway IP: ");
  Serial.println(WiFi.gatewayIP());
  
  Serial.print("Subnet mask: ");
  Serial.println(WiFi.subnetMask());
  
  Serial.print("Laptop MQTT broker IP: ");
  Serial.println(MQTT_BROKER);
}


// Connect and authenticate with Mosquitto
void reconnectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Connecting to MQTT broker...");

    // Create a client ID unique to this ESP32
    String clientId = "ESP32-SmartLight-";
    clientId += String((uint32_t)ESP.getEfuseMac(), HEX);

    if (mqttClient.connect(
          clientId.c_str(),
          MQTT_USERNAME,
          MQTT_PASSWORD
        )) {

      Serial.println(" connected!");

      // Listen for light ON/OFF commands
      if (mqttClient.subscribe(LIGHT_SET_TOPIC, 1)) {
        Serial.println("Subscribed to light command topic.");
      } else {
        Serial.println("Subscription failed.");
      }

      // Report the current LED state
      const char* stateMessage = ledState ? "ON" : "OFF";
      mqttClient.publish(
        LIGHT_STATE_TOPIC,
        stateMessage,
        true
      );

    } else {
      Serial.print("Connection failed. MQTT state: ");
      Serial.println(mqttClient.state());
      Serial.println("Retrying in 3 seconds...");
      delay(3000);
    }
  }
}


void setup() {
  Serial.begin(115200);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LED_OFF);

  connectWiFi();

  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setKeepAlive(30);
  mqttClient.setBufferSize(256);

  reconnectMQTT();
}


void loop() {
  // Restore Wi-Fi connection if it drops
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi disconnected. Reconnecting...");
    connectWiFi();
  }

  // Restore MQTT connection if it drops
  if (!mqttClient.connected()) {
    reconnectMQTT();
  }

  // Process incoming MQTT messages
  mqttClient.loop();

  delay(10);
}
