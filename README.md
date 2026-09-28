# SoilMonitoring
IoT-based soil monitoring system using an ESP32, 7-in-1 RS-485 sensor, MAX485 and Firebase. Measures soil moisture, temperature, pH, EC, nitrogen, phosphorus and potassium, then transmits, stores and visualizes data through a web dashboard with crop-stage decision-support recommendations.
Here’s a polished README you can paste directly into `README.md`:

# IoT-Based Soil Condition and Nutrient Monitoring System

An IoT-based soil monitoring and agricultural decision-support system developed using an **ESP32, 7-in-1 RS-485 soil sensor, MAX485 transceiver, Firebase Cloud Firestore, and a web-based dashboard**.

The system measures key soil parameters, transmits the data through Wi-Fi, stores it in Firebase, and presents the measurements through a web dashboard. The system also uses crop selection and growth-stage information to provide contextual soil-management recommendations.

---

## 🌱 System Overview

The system is designed to provide continuous monitoring of important soil properties and make the resulting information accessible through a web interface.

### Parameters Monitored

| Parameter      | Description                             |
| -------------- | --------------------------------------- |
| Soil Moisture  | Indicates the water content of the soil |
| Temperature    | Monitors soil temperature               |
| pH             | Indicates soil acidity/alkalinity       |
| EC             | Indicates electrical conductivity       |
| Nitrogen (N)   | Monitors nitrogen levels                |
| Phosphorus (P) | Monitors phosphorus levels              |
| Potassium (K)  | Monitors potassium levels               |

---

## 🏗️ System Architecture

```text
┌──────────────────────┐
│   7-in-1 Soil Sensor │
│                      │
│ Moisture             │
│ Temperature          │
│ pH                   │
│ EC                   │
│ N / P / K            │
└──────────┬───────────┘
           │
      RS-485 / Modbus RTU
           │
           ▼
┌──────────────────────┐
│       MAX485         │
│   RS-485 Transceiver │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│        ESP32         │
│                      │
│ Data Processing      │
│ Modbus Communication │
│ Wi-Fi Communication  │
└──────────┬───────────┘
           │
          Wi-Fi
           │
           ▼
┌──────────────────────┐
│       Firebase       │
│    Cloud Firestore   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│    Web Dashboard     │
│                      │
│ Live Data            │
│ Historical Trends    │
│ Crop Selection       │
│ DAP / Growth Stage   │
│ Recommendations      │
└──────────────────────┘
```

---

## 🔧 Hardware

The prototype consists of:

* ESP32 development board
* 7-in-1 RS-485 soil sensor
* MAX485 RS-485 transceiver
* 128×64 I2C OLED display
* Separate sensor power supply
* Regulated MAX485 supply
* Connecting cables and supporting circuitry

### Communication

The soil sensor communicates with the ESP32 using **RS-485 Modbus RTU**.

The MAX485 provides the electrical interface between the sensor's RS-485 bus and the ESP32's serial communication interface.

---

## 💻 Software

### Embedded System

* **Arduino IDE**
* **C/C++**
* ESP32 Arduino Core
* Modbus RTU communication
* Wi-Fi connectivity
* Firebase client library

### Cloud Backend

The system uses **Firebase Cloud Firestore** to store sensor measurements received from the ESP32.

### Dashboard

The web dashboard provides:

* Soil parameter display
* Historical data visualisation
* Crop selection
* Planting-date configuration
* Days After Planting (DAP)
* Growth-stage context
* Soil-condition recommendations

---

## 📁 Repository Structure

```text
├── firmware/
│   ├── SensorTest/
│   ├── OLEDTest/
│   ├── FirebaseTest/
│   └── SoilMonitor/
│
├── dashboard/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── documentation/
│   ├── circuit/
│   ├── testing/
│   └── project-report/
│
└── README.md
```

*The directory structure may change as development progresses.*

---

## 🔄 Data Flow

1. The soil sensor measures the selected soil parameters.
2. Measurements are transmitted using **RS-485 Modbus RTU**.
3. The MAX485 converts the RS-485 electrical interface for the ESP32.
4. The ESP32 reads and processes the sensor registers.
5. The ESP32 connects to Wi-Fi.
6. Measurements are transmitted to Firebase.
7. Firebase stores the measurements in Cloud Firestore.
8. The web dashboard retrieves and visualises the data.
9. Crop and growth-stage information is used to provide contextual recommendations.

---

## 🌾 Crop Decision Support

The dashboard allows the user to select a crop and specify planting information.

The current system is designed to support crops including:

* Maize
* Beans
* Soybeans
* Sugarcane
* Sorghum
* Sweet potatoes
* Potatoes
* Strawberries
* Grapes

Recommendations are intended as **decision-support information** rather than a replacement for laboratory soil analysis or professional agronomic advice.

---

## 🧪 Testing

Development follows a modular testing approach.

Individual components are tested before integration:

* Power-up testing
* OLED display testing
* RS-485 communication testing
* Modbus sensor testing
* ESP32 Wi-Fi testing
* Firebase connectivity testing
* Database testing
* Dashboard testing
* End-to-end system testing

This approach makes it easier to isolate faults between the sensing, embedded, communication, cloud and presentation layers.

---

## ⚠️ Limitations

The current prototype has several limitations:

* NPK measurements should be treated as indicative rather than laboratory-equivalent values.
* Laboratory calibration and validation are required for accurate nutrient quantification.
* The prototype uses a single sensing location and therefore does not represent spatial variability across a large field.
* Wi-Fi connectivity is required for real-time cloud synchronisation.
* Long-term outdoor environmental testing is still required.
* Crop recommendations require further validation using local agronomic data.

---

## 🚀 Future Development

Potential future improvements include:

* Laboratory calibration of the NPK measurements
* Multi-point soil monitoring
* Long-term field deployment
* Solar-powered operation
* Battery management and low-power operation
* Offline data buffering
* Sensor fault detection
* Advanced crop-specific recommendation models
* Dashboard alerts and notifications
* Data export and reporting
* Automated irrigation control
* Integration with additional agricultural sensors

---

## 🎓 Project Purpose

This project demonstrates how **embedded systems, IoT communication, cloud computing and web technologies** can be integrated to transform soil measurements into accessible, time-dependent information for agricultural monitoring and decision support.

---

## 📜 Disclaimer

The system is a prototype developed for academic and research purposes. Sensor measurements and recommendations should be independently validated before being used for precise agricultural management decisions.

---

## 👨‍💻 Project

**IoT-Based Soil Condition and Nutrient Monitoring System**

Developed as an Electrical/Electronics Engineering project.

**Technologies:** ESP32 • RS-485 • Modbus RTU • Firebase • Cloud Firestore • Web Dashboard
