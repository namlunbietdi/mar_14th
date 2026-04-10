const mqtt = require("mqtt");
const { ingestTelemetryPayload } = require("./mqtt-ingest");

let mqttClient = null;

function initMqttClient() {
  const mqttUrl = process.env.MQTT_URL;

  if (!mqttUrl) {
    console.log("MQTT_URL is not configured. Skip MQTT client initialization.");
    return null;
  }

  if (mqttClient) {
    return mqttClient;
  }

  mqttClient = mqtt.connect(mqttUrl, {
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
    clientId: process.env.MQTT_CLIENT_ID || `bus-monitor-${Math.random().toString(16).slice(2, 10)}`,
    keepalive: Number(process.env.MQTT_KEEPALIVE || 60),
    reconnectPeriod: Number(process.env.MQTT_RECONNECT_PERIOD || 5000)
  });

  mqttClient.on("connect", () => {
    const topicPattern = process.env.MQTT_TOPIC_PATTERN || "devices/+/telemetry";
    console.log(`Connected to MQTT broker. Subscribing ${topicPattern}`);
    mqttClient.subscribe(topicPattern, (error) => {
      if (error) {
        console.error("MQTT subscribe failed:", error.message);
      }
    });
  });

  mqttClient.on("reconnect", () => {
    console.log("MQTT reconnecting...");
  });

  mqttClient.on("error", (error) => {
    console.error("MQTT error:", error.message);
  });

  mqttClient.on("message", async (topic, messageBuffer) => {
    try {
      const payload = JSON.parse(messageBuffer.toString());
      await ingestTelemetryPayload(payload, topic);
    } catch (error) {
      console.error("MQTT message processing failed:", error.message);
    }
  });

  return mqttClient;
}

module.exports = {
  initMqttClient
};
