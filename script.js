// ============================================================
// SOIL MONITORING SYSTEM
// app.js
//
// Purpose:
// - Display live soil measurements from Firebase Firestore
// - Display historical readings
// - Display crop and growth-stage reference information
// - Calculate Days After Planting (DAP)
// - Provide a sensor-data simulation for dashboard testing
//
// IMPORTANT:
// This version contains NO fertilizer, irrigation, correction,
// treatment, or other agricultural recommendation engine.
// ============================================================

"use strict";

// ============================================================
// 1. FIREBASE IMPORTS
// ============================================================

import { initializeApp } from
    "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getFirestore,
    collection,
    query,
    orderBy,
    limit,
    onSnapshot
} from
    "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ============================================================
// 2. FIREBASE CONFIGURATION
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyB8gSNILMRMR5a2NWkvjUtQ0k98HEr0mkkM",
    authDomain: "soil-monitoring-system-22d1b.firebaseapp.com",
    projectId: "soil-monitoring-system-22d1b",
    storageBucket: "soil-monitoring-system-22d1b.firebasestorage.app",
    messagingSenderId: "522658188016",
    appId: "1:522658188016:web:58bfdb5f12cbc66fa01035",
    measurementId: "G-32KCJKSCM4"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);


// ============================================================
// 3. SYSTEM CONSTANTS
// ============================================================

const DAY_MS = 24 * 60 * 60 * 1000;

const SENSOR_COLLECTION = "readings";
const DEVICE_ID = "device_01";

const HISTORY_LIMIT = 50;

const AUTO_INTERVAL_MS = 5000;


// ============================================================
// 4. CROP REFERENCE PROFILES
//
// These are reference/educational values only.
// They are NOT used to generate recommendations.
// ============================================================

const CROP_PROFILES = {

    maize: {
        name: "Maize",

        temperature: {
            min: 18,
            max: 30
        },

        ph: {
            min: 5.5,
            max: 7.0
        },

        ecMax: 1.7,

        harvest: "Approximately 90–150 days depending on variety and conditions.",

        overview:
            "Maize is a warm-season cereal crop that requires adequate soil moisture and suitable temperature conditions throughout its growth cycle.",

        signs: [
            "Leaf yellowing may be associated with several environmental or nutritional factors.",
            "Wilting may indicate inadequate water availability or other plant stresses.",
            "Poor growth can result from unsuitable environmental conditions."
        ],

        stages: [
            {
                start: 0,
                end: 14,
                name: "Germination and emergence",
                moisture: { min: 60, max: 80 },
                summary:
                    "Early development depends on suitable moisture, temperature and soil conditions."
            },
            {
                start: 15,
                end: 35,
                name: "Vegetative development",
                moisture: { min: 55, max: 75 },
                summary:
                    "Leaves and roots develop rapidly during this period."
            },
            {
                start: 36,
                end: 65,
                name: "Rapid vegetative growth",
                moisture: { min: 55, max: 75 },
                summary:
                    "The plant develops substantial leaf area and biomass."
            },
            {
                start: 66,
                end: 100,
                name: "Reproductive development",
                moisture: { min: 55, max: 75 },
                summary:
                    "The crop progresses through flowering and grain development."
            },
            {
                start: 101,
                end: 150,
                name: "Grain filling and maturity",
                moisture: { min: 45, max: 70 },
                summary:
                    "Grain filling continues until physiological maturity."
            }
        ]
    },


    beans: {
        name: "Beans",

        temperature: {
            min: 18,
            max: 28
        },

        ph: {
            min: 5.5,
            max: 6.8
        },

        ecMax: 1.5,

        harvest: "Approximately 60–100 days depending on variety.",

        overview:
            "Beans are relatively short-duration legumes that require suitable moisture, temperature and soil conditions.",

        signs: [
            "Yellowing leaves can indicate several possible environmental or nutritional stresses.",
            "Wilting can occur when available soil moisture is insufficient.",
            "Poor establishment can result from unsuitable soil conditions."
        ],

        stages: [
            {
                start: 0,
                end: 14,
                name: "Germination and emergence",
                moisture: { min: 60, max: 80 },
                summary:
                    "Seeds germinate and seedlings emerge from the soil."
            },
            {
                start: 15,
                end: 30,
                name: "Vegetative growth",
                moisture: { min: 55, max: 75 },
                summary:
                    "Leaf and root development increases."
            },
            {
                start: 31,
                end: 50,
                name: "Flowering",
                moisture: { min: 55, max: 75 },
                summary:
                    "The plant enters reproductive development."
            },
            {
                start: 51,
                end: 80,
                name: "Pod development",
                moisture: { min: 50, max: 70 },
                summary:
                    "Pods develop and seeds increase in size."
            },
            {
                start: 81,
                end: 100,
                name: "Maturity",
                moisture: { min: 45, max: 65 },
                summary:
                    "Pods and seeds approach maturity."
            }
        ]
    },


    soybeans: {
        name: "Soybeans",

        temperature: {
            min: 20,
            max: 30
        },

        ph: {
            min: 5.5,
            max: 7.0
        },

        ecMax: 1.5,

        harvest: "Approximately 90–150 days depending on variety.",

        overview:
            "Soybeans are warm-season legumes whose growth is influenced by soil moisture, temperature and soil chemical conditions.",

        signs: [
            "Yellowing or abnormal foliage can have several possible causes.",
            "Water stress can affect plant development.",
            "Poor growth can occur under unsuitable environmental conditions."
        ],

        stages: [
            {
                start: 0,
                end: 15,
                name: "Germination and emergence",
                moisture: { min: 60, max: 80 },
                summary:
                    "Seeds germinate and seedlings emerge."
            },
            {
                start: 16,
                end: 40,
                name: "Vegetative growth",
                moisture: { min: 55, max: 75 },
                summary:
                    "Vegetative growth and canopy development increase."
            },
            {
                start: 41,
                end: 65,
                name: "Flowering",
                moisture: { min: 55, max: 75 },
                summary:
                    "The plant enters reproductive development."
            },
            {
                start: 66,
                end: 100,
                name: "Pod formation",
                moisture: { min: 50, max: 70 },
                summary:
                    "Pods form and seeds begin developing."
            },
            {
                start: 101,
                end: 150,
                name: "Seed filling and maturity",
                moisture: { min: 45, max: 70 },
                summary:
                    "Seeds fill and the crop approaches maturity."
            }
        ]
    },


    sugarcane: {
        name: "Sugarcane",

        temperature: {
            min: 20,
            max: 32
        },

        ph: {
            min: 5.5,
            max: 7.5
        },

        ecMax: 1.8,

        harvest: "Approximately 10–18 months depending on variety and production system.",

        overview:
            "Sugarcane is a long-duration crop that develops through establishment, vegetative growth and cane maturation.",

        signs: [
            "Leaf colour and growth patterns can provide general observations about plant condition.",
            "Water stress may affect cane development.",
            "Poor growth may occur when environmental conditions are unsuitable."
        ],

        stages: [
            {
                start: 0,
                end: 45,
                name: "Establishment",
                moisture: { min: 60, max: 80 },
                summary:
                    "Setts establish roots and new shoots."
            },
            {
                start: 46,
                end: 150,
                name: "Tillering",
                moisture: { min: 55, max: 75 },
                summary:
                    "Multiple shoots develop from the planted material."
            },
            {
                start: 151,
                end: 300,
                name: "Grand growth",
                moisture: { min: 55, max: 75 },
                summary:
                    "Rapid cane and leaf development occurs."
            },
            {
                start: 301,
                end: 450,
                name: "Maturation",
                moisture: { min: 45, max: 70 },
                summary:
                    "Cane biomass develops and the crop approaches maturity."
            }
        ]
    },


    sorghum: {
        name: "Sorghum",

        temperature: {
            min: 20,
            max: 32
        },

        ph: {
            min: 5.5,
            max: 7.5
        },

        ecMax: 1.8,

        harvest: "Approximately 90–150 days depending on variety.",

        overview:
            "Sorghum is a warm-season cereal crop with relatively good tolerance to dry conditions.",

        signs: [
            "Leaf rolling can occur under water stress.",
            "Yellowing leaves may have multiple possible causes.",
            "Poor establishment can occur under unsuitable soil conditions."
        ],

        stages: [
            {
                start: 0,
                end: 15,
                name: "Germination and emergence",
                moisture: { min: 55, max: 75 },
                summary:
                    "Seeds germinate and seedlings emerge."
            },
            {
                start: 16,
                end: 40,
                name: "Vegetative growth",
                moisture: { min: 50, max: 70 },
                summary:
                    "Leaf and root systems develop."
            },
            {
                start: 41,
                end: 70,
                name: "Reproductive development",
                moisture: { min: 50, max: 70 },
                summary:
                    "The crop develops its reproductive structures."
            },
            {
                start: 71,
                end: 110,
                name: "Grain filling",
                moisture: { min: 45, max: 65 },
                summary:
                    "Grain development and filling take place."
            },
            {
                start: 111,
                end: 150,
                name: "Maturity",
                moisture: { min: 40, max: 60 },
                summary:
                    "The crop approaches physiological maturity."
            }
        ]
    },


    sweet_potato: {
        name: "Sweet Potato",

        temperature: {
            min: 20,
            max: 30
        },

        ph: {
            min: 5.5,
            max: 6.5
        },

        ecMax: 1.5,

        harvest: "Approximately 90–150 days depending on variety.",

        overview:
            "Sweet potato is a warm-season root crop whose growth includes establishment, vine development and storage-root formation.",

        signs: [
            "Wilting may indicate water stress or other environmental conditions.",
            "Poor vine development may affect crop establishment.",
            "Abnormal leaf colour can have multiple causes."
        ],

        stages: [
            {
                start: 0,
                end: 20,
                name: "Establishment",
                moisture: { min: 60, max: 80 },
                summary:
                    "Cuttings establish roots and begin producing new growth."
            },
            {
                start: 21,
                end: 50,
                name: "Vine development",
                moisture: { min: 55, max: 75 },
                summary:
                    "Vines and foliage expand."
            },
            {
                start: 51,
                end: 100,
                name: "Root development",
                moisture: { min: 50, max: 70 },
                summary:
                    "Storage roots develop and increase in size."
            },
            {
                start: 101,
                end: 150,
                name: "Maturity",
                moisture: { min: 45, max: 65 },
                summary:
                    "Storage roots approach harvest maturity."
            }
        ]
    },


    potato: {
        name: "Potato",

        temperature: {
            min: 15,
            max: 25
        },

        ph: {
            min: 5.0,
            max: 6.5
        },

        ecMax: 1.7,

        harvest: "Approximately 70–120 days depending on variety.",

        overview:
            "Potato is a cool-season tuber crop with development stages including emergence, vegetative growth, tuber formation and maturation.",

        signs: [
            "Wilting can be associated with water stress or other factors.",
            "Leaf colour changes can have multiple causes.",
            "Poor canopy development may affect tuber development."
        ],

        stages: [
            {
                start: 0,
                end: 20,
                name: "Emergence",
                moisture: { min: 60, max: 80 },
                summary:
                    "Shoots emerge and establish the crop canopy."
            },
            {
                start: 21,
                end: 45,
                name: "Vegetative growth",
                moisture: { min: 55, max: 75 },
                summary:
                    "Leaves and stems develop."
            },
            {
                start: 46,
                end: 75,
                name: "Tuber formation",
                moisture: { min: 55, max: 75 },
                summary:
                    "Tuber initiation and enlargement take place."
            },
            {
                start: 76,
                end: 120,
                name: "Tuber maturation",
                moisture: { min: 45, max: 70 },
                summary:
                    "Tubers mature and the crop approaches harvest."
            }
        ]
    },


    strawberry: {
        name: "Strawberry",

        temperature: {
            min: 15,
            max: 25
        },

        ph: {
            min: 5.5,
            max: 6.5
        },

        ecMax: 1.5,

        harvest: "Harvest timing varies substantially with variety and production system.",

        overview:
            "Strawberries are perennial or short-cycle fruit crops depending on the production system, with vegetative, flowering and fruiting phases.",

        signs: [
            "Wilting can occur under water stress.",
            "Leaf colour changes may have multiple causes.",
            "Poor flowering or fruit development can result from environmental conditions."
        ],

        stages: [
            {
                start: 0,
                end: 30,
                name: "Establishment",
                moisture: { min: 60, max: 80 },
                summary:
                    "Plants establish roots and new vegetative growth."
            },
            {
                start: 31,
                end: 70,
                name: "Vegetative development",
                moisture: { min: 55, max: 75 },
                summary:
                    "Leaves and runners develop."
            },
            {
                start: 71,
                end: 110,
                name: "Flowering and fruit set",
                moisture: { min: 55, max: 75 },
                summary:
                    "Flowers develop and fruit begins forming."
            },
            {
                start: 111,
                end: 150,
                name: "Fruit development",
                moisture: { min: 50, max: 70 },
                summary:
                    "Fruit increases in size and approaches maturity."
            }
        ]
    },


    grapes: {
        name: "Grapes",

        temperature: {
            min: 15,
            max: 30
        },

        ph: {
            min: 5.5,
            max: 7.0
        },

        ecMax: 1.8,

        harvest: "Harvest timing varies by grape variety and climate.",

        overview:
            "Grapevines are perennial plants with annual growth cycles involving bud development, flowering, fruit development and maturation.",

        signs: [
            "Leaf colour and canopy growth provide general observations of plant condition.",
            "Water stress can affect shoot and fruit development.",
            "Fruit development is influenced by environmental conditions."
        ],

        stages: [
            {
                start: 0,
                end: 30,
                name: "Bud development",
                moisture: { min: 50, max: 70 },
                summary:
                    "New shoots and leaves begin developing."
            },
            {
                start: 31,
                end: 70,
                name: "Flowering",
                moisture: { min: 50, max: 70 },
                summary:
                    "Flowering and fruit set take place."
            },
            {
                start: 71,
                end: 120,
                name: "Fruit development",
                moisture: { min: 50, max: 70 },
                summary:
                    "Grapes increase in size and develop."
            },
            {
                start: 121,
                end: 180,
                name: "Ripening",
                moisture: { min: 45, max: 65 },
                summary:
                    "Fruit develops towards harvest maturity."
            }
        ]
    }
};


// ============================================================
// 5. SENSOR METADATA
// ============================================================

const SENSOR_META = {
    moisture: {
        label: "Moisture",
        unit: "%",
        decimals: 1
    },

    temperature: {
        label: "Temperature",
        unit: "°C",
        decimals: 1
    },

    ph: {
        label: "pH",
        unit: "",
        decimals: 1
    },

    ec: {
        label: "Electrical Conductivity",
        shortLabel: "EC",
        unit: "dS/m",
        decimals: 2
    },

    nitrogen: {
        label: "Nitrogen",
        shortLabel: "N",
        unit: "mg/kg",
        decimals: 0
    },

    phosphorus: {
        label: "Phosphorus",
        shortLabel: "P",
        unit: "mg/kg",
        decimals: 0
    },

    potassium: {
        label: "Potassium",
        shortLabel: "K",
        unit: "mg/kg",
        decimals: 0
    }
};

const SENSOR_KEYS = [
    "moisture",
    "temperature",
    "ph",
    "ec",
    "nitrogen",
    "phosphorus",
    "potassium"
];


// ============================================================
// 6. APPLICATION STATE
// ============================================================

let currentReadings = null;
let historicalReadings = [];

let currentSource = "Waiting for sensor data";

let autoEnabled = false;
let autoTimer = null;

let firestoreUnsubscribe = null;


// ============================================================
// 7. DOM HELPERS
// ============================================================

function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return Array.from(document.querySelectorAll(selector));
}


// ============================================================
// 8. GENERAL HELPERS
// ============================================================

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

function roundTo(value, decimals = 1) {
    const multiplier = 10 ** decimals;
    return Math.round(value * multiplier) / multiplier;
}


// ============================================================
// 9. CROP / DAP FUNCTIONS
// ============================================================

function daysAfterPlanting(dateString) {
    if (!dateString) {
        return null;
    }

    // Convert YYYY-MM-DD safely to a local date
    const [year, month, day] = dateString.split("-").map(Number);

    if (!year || !month || !day) {
        return null;
    }

    const plantingDate = new Date(year, month - 1, day);

    if (Number.isNaN(plantingDate.getTime())) {
        return null;
    }

    // Today's date at midnight
    const today = new Date();
    const todayDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
    );

    const difference =
        todayDate.getTime() - plantingDate.getTime();

    // Don't allow negative DAP
    return Math.max(
        0,
        Math.floor(difference / DAY_MS)
    );
}

function getActiveStage(profile, dap) {

    if (!profile || dap === null || dap === undefined) {
        return null;
    }

    return profile.stages.find(stageItem =>
        dap >= stageItem.start &&
        dap <= stageItem.end
    ) || profile.stages[profile.stages.length - 1];
}


function getContext() {

    const cropSelect = $("#cropSelect");
    const plantingDateInput = $("#plantingDate");

    const cropKey = cropSelect?.value || "maize";

    const profile =
        CROP_PROFILES[cropKey] ||
        CROP_PROFILES.maize;

    const dap = daysAfterPlanting(
        plantingDateInput?.value
    );

    const activeStage =
        getActiveStage(profile, dap);

    return {
        cropKey,
        profile,
        dap,
        activeStage
    };
}


// ============================================================
// 10. SENSOR SIMULATION
//
// Used only for dashboard testing.
// It does NOT replace the ESP32 sensor.
// ============================================================

function generateNormalReading(context) {

    const profile = context.profile;

    const stage = context.activeStage;

    const moistureRange =
        stage?.moisture || {
            min: 45,
            max: 70
        };

    return {

        moisture: roundTo(
            randomBetween(
                moistureRange.min,
                moistureRange.max
            ),
            1
        ),

        temperature: roundTo(
            randomBetween(
                profile.temperature.min,
                profile.temperature.max
            ),
            1
        ),

        ph: roundTo(
            randomBetween(
                profile.ph.min,
                profile.ph.max
            ),
            1
        ),

        ec: roundTo(
            randomBetween(
                0.3,
                profile.ecMax * 0.8
            ),
            2
        ),

        nitrogen: Math.round(
            randomBetween(20, 80)
        ),

        phosphorus: Math.round(
            randomBetween(10, 50)
        ),

        potassium: Math.round(
            randomBetween(50, 180)
        )
    };
}


function buildSimulatedReadings(context) {

    return generateNormalReading(context);
}


// ============================================================
// 11. REFERENCE RANGE COMPARISON
//
// This is NOT an advisory system.
//
// It simply describes whether a measurement is:
// - within the selected crop reference range
// - below the reference range
// - above the reference range
//
// No action is generated.
// ============================================================

function compare(value, range) {

    if (
        value === null ||
        value === undefined ||
        Number.isNaN(Number(value))
    ) {
        return "unknown";
    }

    if (!range) {
        return "recorded";
    }

    const numericValue = Number(value);

    if (numericValue < range.min) {
        return "below";
    }

    if (numericValue > range.max) {
        return "above";
    }

    return "within";
}


function getMeasurementStatus(
    key,
    value,
    context
) {

    if (
        value === null ||
        value === undefined ||
        Number.isNaN(Number(value))
    ) {
        return {
            state: "unknown",
            label: "No data"
        };
    }

    const profile = context.profile;

    if (key === "moisture") {

        const range =
            context.activeStage?.moisture;

        if (!range) {
            return {
                state: "recorded",
                label: "Recorded"
            };
        }

        const result = compare(value, range);

        return {
            state: result,
            label:
                result === "within"
                    ? "Within reference range"
                    : result === "below"
                        ? "Below reference range"
                        : "Above reference range"
        };
    }


    if (key === "temperature") {

        const result = compare(
            value,
            profile.temperature
        );

        return {
            state: result,
            label:
                result === "within"
                    ? "Within reference range"
                    : result === "below"
                        ? "Below reference range"
                        : "Above reference range"
        };
    }


    if (key === "ph") {

        const result = compare(
            value,
            profile.ph
        );

        return {
            state: result,
            label:
                result === "within"
                    ? "Within reference range"
                    : result === "below"
                        ? "Below reference range"
                        : "Above reference range"
        };
    }


    if (key === "ec") {

        if (
            profile.ecMax === undefined ||
            profile.ecMax === null
        ) {
            return {
                state: "recorded",
                label: "Recorded"
            };
        }

        if (Number(value) <= profile.ecMax) {
            return {
                state: "within",
                label: "Within reference range"
            };
        }

        return {
            state: "above",
            label: "Above reference range"
        };
    }


    // N, P and K are deliberately NOT compared
    // against fertilizer/nutrient thresholds.
    return {
        state: "recorded",
        label: "Recorded measurement"
    };
}


function readingDescription(
    key,
    value,
    context
) {

    const status =
        getMeasurementStatus(
            key,
            value,
            context
        );

    return status.label;
}


// ============================================================
// 12. VALUE FORMATTING
// ============================================================

function renderValue(
    key,
    value
) {

    if (
        value === null ||
        value === undefined ||
        Number.isNaN(Number(value))
    ) {
        return "--";
    }

    const meta = SENSOR_META[key];

    if (!meta) {
        return String(value);
    }

    const numericValue =
        Number(value);

    return `${numericValue.toFixed(meta.decimals)}${meta.unit ? ` ${meta.unit}` : ""}`;
}


// ============================================================
// 13. RENDER SENSOR CARDS
// ============================================================

function renderReadings(
    readings,
    context = getContext()
) {

    if (!readings) {
        renderEmptyReadings();
        return;
    }

    SENSOR_KEYS.forEach(key => {

        const value = readings[key];

        // Supports several possible ID naming conventions.
        const possibleElements = [
            $(`#${key}`),
            $(`[data-reading="${key}"]`),
            $(`.reading-card[data-sensor="${key}"]`)
        ].filter(Boolean);

        possibleElements.forEach(element => {

            const valueElement =
                element.querySelector(
                    ".reading-value, .value"
                ) || element;

            valueElement.textContent =
                renderValue(key, value);

            const status =
                getMeasurementStatus(
                    key,
                    value,
                    context
                );

            element.dataset.status =
                status.state;

            const statusElement =
                element.querySelector(
                    ".reading-status, .status"
                );

            if (statusElement) {
                statusElement.textContent =
                    status.label;
            }
        });
    });


    // Generic data-value elements
    $$("[data-value]").forEach(element => {

        const key =
            element.dataset.value;

        if (SENSOR_KEYS.includes(key)) {
            element.textContent =
                renderValue(
                    key,
                    readings[key]
                );
        }
    });


    // Generic data-status elements
    $$("[data-status]").forEach(element => {

        const key =
            element.dataset.status;

        if (SENSOR_KEYS.includes(key)) {

            const status =
                getMeasurementStatus(
                    key,
                    readings[key],
                    context
                );

            element.textContent =
                status.label;

            element.dataset.state =
                status.state;
        }
    });
}


function renderEmptyReadings() {

    $$("[data-value]").forEach(element => {
        element.textContent = "--";
    });

    SENSOR_KEYS.forEach(key => {

        const element =
            $(`#${key}`);

        if (!element) {
            return;
        }

        const valueElement =
            element.querySelector(
                ".reading-value, .value"
            );

        if (valueElement) {
            valueElement.textContent = "--";
        }

        const statusElement =
            element.querySelector(
                ".reading-status, .status"
            );

        if (statusElement) {
            statusElement.textContent =
                "Waiting for data";
        }
    });
}


// ============================================================
// 14. CROP PROFILE DISPLAY
// ============================================================

function formatRange(range, unit = "") {

    if (!range) {
        return "Not available";
    }

    return `${range.min}–${range.max}${unit ? ` ${unit}` : ""}`;
}


function renderProfile(context) {

    const profile = context.profile;

    const dap = context.dap;

    const stage = context.activeStage;


    // Crop name
    $$("[data-crop-name]").forEach(element => {
        element.textContent =
            profile.name;
    });


    // Overview
    $$("[data-crop-overview]").forEach(element => {
        element.textContent =
            profile.overview;
    });


    // Harvest information
    $$("[data-crop-harvest]").forEach(element => {
        element.textContent =
            profile.harvest;
    });


    // Temperature reference
    $$("[data-crop-temperature]").forEach(element => {
        element.textContent =
            formatRange(
                profile.temperature,
                "°C"
            );
    });


    // pH reference
    $$("[data-crop-ph]").forEach(element => {
        element.textContent =
            formatRange(
                profile.ph
            );
    });


    // EC reference
    $$("[data-crop-ec]").forEach(element => {
        element.textContent =
            profile.ecMax !== undefined
                ? `≤ ${profile.ecMax} dS/m`
                : "Not available";
    });


    // DAP
    $$("[data-dap]").forEach(element => {

        element.textContent =
            dap === null
                ? "--"
                : dap;
    });


    // Current growth stage
    $$("[data-stage-name]").forEach(element => {

        element.textContent =
            stage?.name ||
            "Stage unavailable";
    });


    // Stage summary
    $$("[data-stage-summary]").forEach(element => {

        element.textContent =
            stage?.summary ||
            "Select a planting date to view the current growth stage.";
    });


    // Stage moisture reference
    $$("[data-stage-moisture]").forEach(element => {

        element.textContent =
            stage?.moisture
                ? formatRange(
                    stage.moisture,
                    "%"
                )
                : "Not available";
    });


    // Crop signs / observations
    const signsContainer =
        $("[data-crop-signs]");

    if (signsContainer) {

        signsContainer.innerHTML = "";

        profile.signs.forEach(sign => {

            const item =
                document.createElement("li");

            item.textContent = sign;

            signsContainer.appendChild(item);
        });
    }


    // Stage table/list
    const stagesContainer =
        $("[data-crop-stages]");

    if (stagesContainer) {

        stagesContainer.innerHTML = "";

        profile.stages.forEach(stageItem => {

            const item =
                document.createElement("div");

            item.className =
                "crop-stage-item";

            item.innerHTML = `
                <strong>${escapeHtml(stageItem.name)}</strong>
                <span>
                    DAP ${stageItem.start}–${stageItem.end}
                </span>
                <small>
                    Moisture reference:
                    ${escapeHtml(
                        formatRange(
                            stageItem.moisture,
                            "%"
                        )
                    )}
                </small>
            `;

            stagesContainer.appendChild(item);
        });
    }
}


// ============================================================
// 15. MONITORING STATUS PANEL
//
// This replaces the old recommendation/action panel.
// ============================================================

function renderMonitoringStatus(
    readings,
    context,
    timestamp = null
) {

    const containers = [
        $("[data-monitoring-status]"),
        $(".action-panel"),
        $("#recommendations")
    ].filter(Boolean);

    if (!containers.length) {
        return;
    }

    const timeText =
        timestamp
            ? formatTimestamp(timestamp)
            : "Not available";

    const sourceText =
        currentSource || "Unknown";

    const hasReadings =
        readings &&
        SENSOR_KEYS.some(
            key =>
                readings[key] !== null &&
                readings[key] !== undefined
        );

    const message = hasReadings
        ? `
            <div class="monitoring-status">
                <h3>Monitoring Status</h3>

                <p>
                    Sensor data received successfully.
                </p>

                <p>
                    <strong>Source:</strong>
                    ${escapeHtml(sourceText)}
                </p>

                <p>
                    <strong>Latest reading:</strong>
                    ${escapeHtml(timeText)}
                </p>

                <p>
                    <strong>Crop:</strong>
                    ${escapeHtml(context.profile.name)}
                </p>

                <p>
                    <strong>Growth stage:</strong>
                    ${escapeHtml(
                        context.activeStage?.name ||
                        "Not determined"
                    )}
                </p>

                <small>
                    Reference-range labels describe the
                    relationship between measured values and
                    the selected crop reference data. They do
                    not constitute fertilizer, irrigation or
                    treatment recommendations.
                </small>
            </div>
        `
        : `
            <div class="monitoring-status">
                <h3>Monitoring Status</h3>
                <p>Waiting for soil sensor data.</p>
            </div>
        `;

    containers.forEach(container => {
        container.innerHTML = message;
    });
}


// ============================================================
// 16. WAITING / READY STATES
// ============================================================

function renderWaitingState() {

    const statusElements = [
        $("[data-system-status]"),
        $("#systemStatus"),
        $(".system-status")
    ].filter(Boolean);

    statusElements.forEach(element => {

        element.textContent =
            "Waiting for sensor data";

        element.dataset.state =
            "waiting";
    });
}


function renderReadyForReading() {

    const statusElements = [
        $("[data-system-status]"),
        $("#systemStatus"),
        $(".system-status")
    ].filter(Boolean);

    statusElements.forEach(element => {

        element.textContent =
            "Sensor data available";

        element.dataset.state =
            "ready";
    });
}


function refreshSetupState() {

    const context = getContext();

    renderProfile(context);

    if (currentReadings) {

        renderReadings(
            currentReadings,
            context
        );

        renderMonitoringStatus(
            currentReadings,
            context
        );
    }
}


// ============================================================
// 17. TIMESTAMP HANDLING
// ============================================================

function formatTimestamp(timestamp) {

    if (!timestamp) {
        return "--";
    }


    // Firebase Timestamp
    if (
        typeof timestamp === "object" &&
        typeof timestamp.toDate === "function"
    ) {

        return timestamp
            .toDate()
            .toLocaleString();
    }


    // JavaScript Date
    if (timestamp instanceof Date) {

        return timestamp.toLocaleString();
    }


    // Number
    if (typeof timestamp === "number") {

        const date =
            new Date(timestamp);

        if (!Number.isNaN(date.getTime())) {
            return date.toLocaleString();
        }
    }


    // String
    const date =
        new Date(timestamp);

    if (!Number.isNaN(date.getTime())) {
        return date.toLocaleString();
    }


    return String(timestamp);
}


// ============================================================
// 18. NORMALISE FIRESTORE READING
// ============================================================

function normaliseFirestoreReading(data) {

    return {

        moisture:
            toNumberOrNull(data.moisture),

        temperature:
            toNumberOrNull(data.temperature),

        ec:
            toNumberOrNull(data.ec),

        ph:
            toNumberOrNull(data.ph),

        nitrogen:
            toNumberOrNull(data.nitrogen),

        phosphorus:
            toNumberOrNull(data.phosphorus),

        potassium:
            toNumberOrNull(data.potassium),

        deviceId:
            data.deviceId || null,

        measuredAt:
            data.measuredAt || null
    };
}


function toNumberOrNull(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : null;
}


// ============================================================
// 19. APPLY READINGS TO DASHBOARD
// ============================================================

function applyReadings(
    readings,
    options = {}
) {

    if (!readings) {
        return;
    }

    currentReadings =
        normaliseFirestoreReading(
            readings
        );

    currentSource =
        options.source ||
        "Live ESP32 sensor";

    const context =
        getContext();

    renderReadings(
        currentReadings,
        context
    );

    renderProfile(context);

    renderMonitoringStatus(
        currentReadings,
        context,
        currentReadings.measuredAt
    );

    renderReadyForReading();


    // Optional timestamp elements
    $$("[data-last-updated]").forEach(
        element => {

            element.textContent =
                formatTimestamp(
                    currentReadings.measuredAt
                );
        }
    );


    // Optional device ID elements
    $$("[data-device-id]").forEach(
        element => {

            element.textContent =
                currentReadings.deviceId ||
                DEVICE_ID;
        }
    );
}


// ============================================================
// 20. FIRESTORE REAL-TIME LISTENER
//
// Reads:
// readings/
//      <document>
//          deviceId
//          moisture
//          temperature
//          ec
//          ph
//          nitrogen
//          phosphorus
//          potassium
//          measuredAt
//
// The newest documents are displayed first.
// ============================================================

function startFirestoreListener() {

    if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
        firestoreUnsubscribe = null;
    }


    renderWaitingState();


    const readingsRef =
        collection(
            db,
            SENSOR_COLLECTION
        );


    const readingsQuery =
        query(
            readingsRef,
            orderBy(
                "measuredAt",
                "desc"
            ),
            limit(HISTORY_LIMIT)
        );


    firestoreUnsubscribe =
        onSnapshot(
            readingsQuery,

            snapshot => {

                if (snapshot.empty) {

                    currentReadings = null;
                    historicalReadings = [];

                    renderEmptyReadings();

                    const context =
                        getContext();

                    renderMonitoringStatus(
                        null,
                        context
                    );

                    renderWaitingState();

                    return;
                }


                const readings = [];


                snapshot.forEach(
                    documentSnapshot => {

                        const data =
                            documentSnapshot.data();

                        readings.push({

                            id:
                                documentSnapshot.id,

                            ...normaliseFirestoreReading(
                                data
                            )
                        });
                    }
                );


                historicalReadings =
                    readings;


                // Newest document is first because
                // the query is ordered descending.
                const newestReading =
                    readings[0];


                if (
                    newestReading.deviceId &&
                    newestReading.deviceId !== DEVICE_ID
                ) {

                    console.warn(
                        "Latest reading belongs to another device:",
                        newestReading.deviceId
                    );
                }


                applyReadings(
                    newestReading,
                    {
                        source:
                            "Live ESP32 sensor"
                    }
                );


                renderHistory(
                    historicalReadings
                );


                updateConnectionStatus(
                    "Connected to Firestore"
                );
            },

            error => {

                console.error(
                    "Firestore listener error:",
                    error
                );

                updateConnectionStatus(
                    "Firestore connection error"
                );

                const statusElements = [
                    $("[data-system-status]"),
                    $("#systemStatus"),
                    $(".system-status")
                ].filter(Boolean);

                statusElements.forEach(
                    element => {

                        element.textContent =
                            "Firestore connection error";

                        element.dataset.state =
                            "error";
                    }
                );
            }
        );
}


// ============================================================
// 21. HISTORY DISPLAY
// ============================================================

function renderHistory(readings) {

    const historyContainer =
        $("[data-history]");

    if (!historyContainer) {
        return;
    }


    if (!readings.length) {

        historyContainer.innerHTML =
            "<p>No historical readings available.</p>";

        return;
    }


    historyContainer.innerHTML = readings
        .map(reading => {

            return `
                <div class="history-row">

                    <span>
                        ${escapeHtml(
                            formatTimestamp(
                                reading.measuredAt
                            )
                        )}
                    </span>

                    <span>
                        ${renderValue(
                            "moisture",
                            reading.moisture
                        )}
                    </span>

                    <span>
                        ${renderValue(
                            "temperature",
                            reading.temperature
                        )}
                    </span>

                    <span>
                        ${renderValue(
                            "ph",
                            reading.ph
                        )}
                    </span>

                    <span>
                        ${renderValue(
                            "ec",
                            reading.ec
                        )}
                    </span>

                    <span>
                        ${renderValue(
                            "nitrogen",
                            reading.nitrogen
                        )}
                    </span>

                    <span>
                        ${renderValue(
                            "phosphorus",
                            reading.phosphorus
                        )}
                    </span>

                    <span>
                        ${renderValue(
                            "potassium",
                            reading.potassium
                        )}
                    </span>

                </div>
            `;

        })
        .join("");
}


// ============================================================
// 22. CONNECTION STATUS
// ============================================================

function updateConnectionStatus(
    message
) {

    const elements = [
        $("[data-firebase-status]"),
        $("#firebaseStatus"),
        $(".firebase-status")
    ].filter(Boolean);

    elements.forEach(element => {

        element.textContent =
            message;

        element.dataset.state =
            message.includes("error")
                ? "error"
                : "connected";
    });
}


// ============================================================
// 23. SIMULATION
//
// This remains useful while the physical sensor is being
// tested. Simulation never writes fake values to Firebase.
// ============================================================

function simulate() {

    const context =
        getContext();

    const simulated =
        buildSimulatedReadings(
            context
        );

    simulated.deviceId =
        "simulation";

    simulated.measuredAt =
        new Date();

    currentSource =
        "Dashboard simulation";

    applyReadings(
        simulated,
        {
            source:
                "Dashboard simulation"
        }
    );

    updateConnectionStatus(
        "Simulation active — Firestore still connected"
    );
}


// ============================================================
// 24. AUTOMATIC SIMULATION
// ============================================================

function setAutoSimulation(
    enabled
) {

    autoEnabled =
        Boolean(enabled);


    if (autoTimer) {

        clearInterval(
            autoTimer
        );

        autoTimer = null;
    }


    if (autoEnabled) {

        simulate();

        autoTimer =
            setInterval(
                simulate,
                AUTO_INTERVAL_MS
            );
    }
}


// ============================================================
// 25. SETUP EVENT HANDLERS
// ============================================================

function handleSetupChange() {

    const context =
        getContext();

    renderProfile(
        context
    );


    if (currentReadings) {

        renderReadings(
            currentReadings,
            context
        );

        renderMonitoringStatus(
            currentReadings,
            context,
            currentReadings.measuredAt
        );
    }
}


// ============================================================
// 26. HTML ESCAPING
// ============================================================

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ============================================================
// 27. INITIALIZE
// ============================================================

function initialize() {

    console.log(
        "Soil Monitoring System starting..."
    );

    console.log(
        "Firebase project:",
        firebaseConfig.projectId
    );

    console.log(
        "Firestore collection:",
        SENSOR_COLLECTION
    );


    // Initial crop/stage state
    refreshSetupState();


    // Crop selector
    const cropSelect =
        $("#cropSelect");

    if (cropSelect) {

        cropSelect.addEventListener(
            "change",
            handleSetupChange
        );
    }


    // Planting date
    const plantingDate =
        $("#plantingDate");

    if (plantingDate) {

        plantingDate.addEventListener(
            "change",
            handleSetupChange
        );

        plantingDate.addEventListener(
            "input",
            handleSetupChange
        );
    }


    // Simulation button
    const simulateButton =
        $("#simulateButton");

    if (simulateButton) {

        simulateButton.addEventListener(
            "click",
            simulate
        );
    }


    // Auto simulation checkbox
    const autoSimulation =
        $("#autoSimulation");

    if (autoSimulation) {

        autoSimulation.addEventListener(
            "change",
            event => {

                setAutoSimulation(
                    event.target.checked
                );
            }
        );
    }


    // Start Firebase
    startFirestoreListener();
}


// ============================================================
// 28. PUBLIC DASHBOARD API
//
// Useful for debugging from the browser console.
// ============================================================

window.SoilDashboard = {

    profiles:
        CROP_PROFILES,

    simulate,

    ingest:
        applyReadings,

    getState() {

        return {

            currentReadings,

            historicalReadings,

            currentSource,

            autoEnabled,

            context:
                getContext()
        };
    },

    setAutoSimulation,

    refresh:
        refreshSetupState,

    startFirestoreListener
};


// ============================================================
// 29. START APPLICATION
// ============================================================

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initialize
    );

} else {

    initialize();
}applyReadings