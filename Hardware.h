#pragma once

// -------------------------
// MAX485 / RS-485
// -------------------------
#define RS485_RX_PIN 16
#define RS485_TX_PIN 17
#define RS485_DE_RE_PIN 4

// -------------------------
// OLED
// -------------------------
#define OLED_SDA_PIN 21
#define OLED_SCL_PIN 22

#define OLED_WIDTH 128
#define OLED_HEIGHT 64
#define OLED_ADDRESS 0x3C

// -------------------------
// Sensor
// -------------------------
#define SENSOR_ADDRESS 1
#define SENSOR_BAUD 4800

// -------------------------
// Timing
// -------------------------
#define SENSOR_INTERVAL 5000UL
#define FIREBASE_INTERVAL 10000UL