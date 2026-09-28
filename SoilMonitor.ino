#include <Arduino.h>
#include <WiFi.h>
#include <Wire.h>

#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#include <Firebase_ESP_Client.h>

#include "addons/TokenHelper.h"

#include "Hardware.h"
#include "Secrets.h"

// =====================================================
// UART
// =====================================================

HardwareSerial RS485Serial(2);

// =====================================================
// OLED
// =====================================================

Adafruit_SSD1306 oled(
  OLED_WIDTH,
  OLED_HEIGHT,
  &Wire,
  -1
);

// =====================================================
// Firebase
// =====================================================

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// =====================================================
// Sensor data structure
// =====================================================

struct SoilData {
  float moisture = 0;
  float temperature = 0;
  uint16_t ec = 0;
  float ph = 0;
  uint16_t nitrogen = 0;
  uint16_t phosphorus = 0;
  uint16_t potassium = 0;

  bool valid = false;
};

// =====================================================
// Global variables
// =====================================================

SoilData latest;

unsigned long lastSensorRead = 0;
unsigned long lastFirebaseUpload = 0;

// =====================================================
// MAX485 direction
// =====================================================

void rs485Transmit() {
  digitalWrite(RS485_DE_RE_PIN, HIGH);
}

void rs485Receive() {
  digitalWrite(RS485_DE_RE_PIN, LOW);
}

// =====================================================
// Wi-Fi
// =====================================================

void connectWiFi() {

  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.println("Connecting to Wi-Fi...");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();

  while (
    WiFi.status() != WL_CONNECTED &&
    millis() - start < 15000
  ) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {

    Serial.println("Wi-Fi connected!");

    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());

  } else {

    Serial.println("Wi-Fi connection failed.");

  }
}

// =====================================================
// Modbus CRC16
// =====================================================

uint16_t modbusCRC(
  const uint8_t *buffer,
  uint8_t length
) {

  uint16_t crc = 0xFFFF;

  for (uint8_t pos = 0; pos < length; pos++) {

    crc ^= buffer[pos];

    for (uint8_t i = 0; i < 8; i++) {

      if (crc & 1) {
        crc >>= 1;
        crc ^= 0xA001;
      } else {
        crc >>= 1;
      }

    }

  }

  return crc;
}

// =====================================================
// Read sensor
// =====================================================

bool readSensor(SoilData &data) {

  uint8_t request[] = {
    0x01,
    0x03,
    0x00,
    0x00,
    0x00,
    0x07,
    0x04,
    0x08
  };

  uint8_t response[32];

  while (RS485Serial.available()) {
    RS485Serial.read();
  }

  // -------------------------
  // Transmit request
  // -------------------------

  rs485Transmit();

  delay(2);

  RS485Serial.write(
    request,
    sizeof(request)
  );

  RS485Serial.flush();

  rs485Receive();

  // -------------------------
  // Wait for response
  // -------------------------

  delay(200);

  uint8_t count = 0;

  unsigned long start = millis();

  while (
    millis() - start < 500 &&
    count < sizeof(response)
  ) {

    if (RS485Serial.available()) {

      response[count++] =
        RS485Serial.read();

    }

  }

  // Expected:
  //
  // 01
  // 03
  // 0E
  // 7 × 2 data bytes
  // CRC
  //
  // total = 19 bytes

  if (count < 19) {

    Serial.println(
      "Sensor: no/short response"
    );

    return false;
  }

  // -------------------------
  // Validate header
  // -------------------------

  if (response[0] != SENSOR_ADDRESS ||
      response[1] != 0x03 ||
      response[2] != 14) {

    Serial.println(
      "Sensor: invalid response"
    );

    return false;
  }

  // -------------------------
  // Validate CRC
  // -------------------------

  uint16_t receivedCRC =
    response[17] |
    (response[18] << 8);

  uint16_t calculatedCRC =
    modbusCRC(response, 17);

  if (receivedCRC != calculatedCRC) {

    Serial.println(
      "Sensor: CRC error"
    );

    return false;
  }

  // -------------------------
  // Convert registers
  // -------------------------

  uint16_t moistureRaw =
    (response[3] << 8) |
    response[4];

  int16_t temperatureRaw =
    (response[5] << 8) |
    response[6];

  uint16_t ecRaw =
    (response[7] << 8) |
    response[8];

  uint16_t phRaw =
    (response[9] << 8) |
    response[10];

  uint16_t nitrogenRaw =
    (response[11] << 8) |
    response[12];

  uint16_t phosphorusRaw =
    (response[13] << 8) |
    response[14];

  uint16_t potassiumRaw =
    (response[15] << 8) |
    response[16];

  // -------------------------
  // Engineering units
  // -------------------------

  data.moisture =
    moistureRaw / 10.0;

  data.temperature =
    temperatureRaw / 10.0;

  data.ec =
    ecRaw;

  data.ph =
    phRaw / 10.0;

  data.nitrogen =
    nitrogenRaw;

  data.phosphorus =
    phosphorusRaw;

  data.potassium =
    potassiumRaw;

  data.valid = true;

  return true;
}

// =====================================================
// OLED
// =====================================================

void displayData() {

  if (!oled.begin(
        SSD1306_SWITCHCAPVCC,
        OLED_ADDRESS
      )) {

    return;
  }

  oled.clearDisplay();

  oled.setTextColor(
    SSD1306_WHITE
  );

  oled.setTextSize(1);

  oled.setCursor(0, 0);

  if (!latest.valid) {

    oled.println("Soil Monitor");
    oled.println();
    oled.println("Sensor error");

  } else {

    oled.print("M: ");
    oled.print(latest.moisture, 1);
    oled.println("%");

    oled.print("T: ");
    oled.print(latest.temperature, 1);
    oled.println(" C");

    oled.print("pH: ");
    oled.println(latest.ph, 1);

    oled.print("EC: ");
    oled.println(latest.ec);

    oled.print("N:");
    oled.print(latest.nitrogen);

    oled.print(" P:");
    oled.print(latest.phosphorus);

    oled.print(" K:");
    oled.println(latest.potassium);

  }

  oled.display();
}

// =====================================================
// Firebase / Firestore
// =====================================================

void uploadToFirestore() {

  if (!Firebase.ready()) {
    Serial.println("Firebase not ready.");
    return;
  }

  if (!latest.valid) {
    Serial.println("No valid sensor data.");
    return;
  }

  FirebaseJson content;

  content.set(
    "fields/deviceId/stringValue",
    DEVICE_ID
  );

  content.set(
    "fields/moisture/doubleValue",
    latest.moisture
  );

  content.set(
    "fields/temperature/doubleValue",
    latest.temperature
  );

  content.set(
    "fields/ec/integerValue",
    String(latest.ec)
  );

  content.set(
    "fields/ph/doubleValue",
    latest.ph
  );

  content.set(
    "fields/nitrogen/integerValue",
    String(latest.nitrogen)
  );

  content.set(
    "fields/phosphorus/integerValue",
    String(latest.phosphorus)
  );

  content.set(
    "fields/potassium/integerValue",
    String(latest.potassium)
  );

  // RFC3339 timestamp
  struct tm timeinfo;

  if (getLocalTime(&timeinfo)) {

    char timestamp[32];

    strftime(
      timestamp,
      sizeof(timestamp),
      "%Y-%m-%dT%H:%M:%SZ",
      &timeinfo
    );

    content.set(
      "fields/measuredAt/timestampValue",
      timestamp
    );
  }

  // Unique document ID
  String documentId =
    String((uint32_t)millis());

  String documentPath =
    "readings/" + documentId;

  Serial.println(
    "Uploading reading..."
  );

  if (
    Firebase.Firestore.createDocument(
      &fbdo,
      FIREBASE_PROJECT_ID,
      "",
      documentPath.c_str(),
      content.raw()
    )
  ) {

    Serial.println(
      "Firestore upload successful!"
    );

  } else {

    Serial.print(
      "Firestore error: "
    );

    Serial.println(
      fbdo.errorReason()
    );

  }
}

// =====================================================
// SETUP
// =====================================================

void setup() {

  Serial.begin(115200);

  delay(1000);

  Serial.println();
  Serial.println("==============================");
  Serial.println("SOIL MONITORING SYSTEM");
  Serial.println("==============================");

  // -------------------------
  // MAX485
  // -------------------------

  pinMode(
    RS485_DE_RE_PIN,
    OUTPUT
  );

  rs485Receive();

  RS485Serial.begin(
    SENSOR_BAUD,
    SERIAL_8N1,
    RS485_RX_PIN,
    RS485_TX_PIN
  );

  // -------------------------
  // OLED
  // -------------------------

  Wire.begin(
    OLED_SDA_PIN,
    OLED_SCL_PIN
  );

  oled.begin(
    SSD1306_SWITCHCAPVCC,
    OLED_ADDRESS
  );

  oled.clearDisplay();

  oled.setTextColor(
    SSD1306_WHITE
  );

  oled.setTextSize(1);

  oled.setCursor(0, 0);

  oled.println("Soil Monitor");
  oled.println("Starting...");

  oled.display();

  // -------------------------
  // Wi-Fi
  // -------------------------

  connectWiFi();

  // -------------------------
  // Time
  // -------------------------

  configTime(
    0,
    0,
    "pool.ntp.org",
    "time.google.com"
  );

  // -------------------------
  // Firebase
  // -------------------------

  config.api_key =
    FIREBASE_API_KEY;

  auth.user.email =
    FIREBASE_USER_EMAIL;

  auth.user.password =
    FIREBASE_USER_PASSWORD;

  Firebase.begin(
    &config,
    &auth
  );

  Firebase.reconnectWiFi(true);

  Serial.println(
    "Firebase initialized."
  );

  oled.clearDisplay();

  oled.setCursor(0, 0);

  oled.println("Soil Monitor");

  if (WiFi.status() ==
      WL_CONNECTED) {

    oled.println("WiFi OK");

  } else {

    oled.println("WiFi ERROR");

  }

  oled.display();
}

// =====================================================
// LOOP
// =====================================================

void loop() {

  connectWiFi();

  // -------------------------
  // Sensor
  // -------------------------

  if (
    millis() - lastSensorRead >=
    SENSOR_INTERVAL
  ) {

    lastSensorRead = millis();

    SoilData newData;

    if (readSensor(newData)) {

      latest = newData;

      Serial.println();
      Serial.println(
        "===== SOIL DATA ====="
      );

      Serial.print("Moisture: ");
      Serial.print(
        latest.moisture
      );
      Serial.println("%");

      Serial.print("Temperature: ");
      Serial.print(
        latest.temperature
      );
      Serial.println(" C");

      Serial.print("EC: ");
      Serial.println(
        latest.ec
      );

      Serial.print("pH: ");
      Serial.println(
        latest.ph
      );

      Serial.print("N: ");
      Serial.println(
        latest.nitrogen
      );

      Serial.print("P: ");
      Serial.println(
        latest.phosphorus
      );

      Serial.print("K: ");
      Serial.println(
        latest.potassium
      );

      displayData();

    } else {

      latest.valid = false;

      displayData();
    }
  }

  // -------------------------
  // Firebase
  // -------------------------

  if (
    millis() - lastFirebaseUpload >=
    FIREBASE_INTERVAL
  ) {

    lastFirebaseUpload =
      millis();

    uploadToFirestore();
  }

  delay(10);
}