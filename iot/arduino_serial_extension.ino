/*
  Serial extension for your existing Arduino sketch.
  Keep your current LCD, relay, and buzzer logic exactly as-is.
  Only add the lines below into your working project.
*/

const unsigned long serialIntervalMs = 5000;
unsigned long lastSerialSentAt = 0;
String incomingCommand = "";
const int fanControlPin = D5;
const bool fanRelayActiveLow = true;

void setup() {
  // Keep your existing setup code unchanged.
  Serial.begin(9600);
  pinMode(fanControlPin, OUTPUT);
  digitalWrite(fanControlPin, fanRelayActiveLow ? HIGH : LOW);
}

void loop() {
  // Keep your existing sensor reads unchanged.
  // Example variable names below must match your current sketch:
  // float temperature = dht.readTemperature();
  // float humidity = dht.readHumidity();
  // int ammonia = analogRead(mq135Pin);

  // Keep your existing LCD, relay, and buzzer logic unchanged.

  if (millis() - lastSerialSentAt >= serialIntervalMs) {
    lastSerialSentAt = millis();
    sendSensorJson(temperature, humidity, ammonia);
  }

  handleSerialControl();

  // Keep the rest of your existing loop logic unchanged.
}

void sendSensorJson(float temperature, float humidity, int ammonia) {
  Serial.print("{\"temperature\":");
  Serial.print((int)round(temperature));
  Serial.print(",\"humidity\":");
  Serial.print((int)round(humidity));
  Serial.print(",\"ammonia\":");
  Serial.print(ammonia);
  Serial.println("}");
}

void handleSerialControl() {
  while (Serial.available() > 0) {
    char incomingChar = (char)Serial.read();
    if (incomingChar == '\n' || incomingChar == '\r') {
      if (incomingCommand.length() > 0) {
        applyControlCommand(incomingCommand);
        incomingCommand = "";
      }
      continue;
    }

    incomingCommand += incomingChar;
  }
}

void applyControlCommand(String command) {
  command.trim();
  if (command.length() == 0) {
    return;
  }

  int separatorIndex = command.indexOf(':');
  if (separatorIndex < 0) {
    return;
  }

  String device = command.substring(0, separatorIndex);
  String state = command.substring(separatorIndex + 1);
  device.toLowerCase();
  state.toUpperCase();

  if (device == "fan") {
    bool turnOn = state == "ON";
    digitalWrite(fanControlPin, turnOn ? (fanRelayActiveLow ? LOW : HIGH) : (fanRelayActiveLow ? HIGH : LOW));
  }

  // Replace this with your actual relay or transistor control for heater.
  if (device == "heater") {
    // digitalWrite(HEATER_RELAY_PIN, state == "ON" ? HIGH : LOW);
  }

  Serial.print("ACK:");
  Serial.println(command);
}
