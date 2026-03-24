import Twilio from "twilio";

const ALERT_COOLDOWN_MS = 5_000;

declare global {
  // eslint-disable-next-line no-var
  var lastAlertTime: number | undefined;
}

export async function sendWhatsAppAlert(message: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim();
  const to = process.env.TWILIO_WHATSAPP_TO?.trim();

  if (!accountSid || !authToken || !from || !to) {
    console.warn(
      "Twilio WhatsApp alert skipped: missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, or TWILIO_WHATSAPP_TO.",
    );
    return false;
  }

  try {
    const client = Twilio(accountSid, authToken);
    await client.messages.create({
      from,
      to,
      body: message,
    });
    return true;
  } catch (error) {
    console.error("Failed to send WhatsApp alert:", error);
    return false;
  }
}

export async function maybeSendSensorAlerts(input: {
  temperature: number;
  ammonia: number;
}): Promise<boolean> {
  const temperature = Number(input.temperature);
  const ammonia = Number(input.ammonia);

  console.log("Temp:", temperature);
  console.log("Gas:", ammonia);

  let alertSent = false;

  if (temperature >= 35 || ammonia > 20) {
    const now = Date.now();

    if (!globalThis.lastAlertTime || now - globalThis.lastAlertTime > ALERT_COOLDOWN_MS) {
      const message = `ALERT!
Temperature: ${temperature} C
Ammonia: ${ammonia}

Fan turned ON automatically.`;

      try {
        alertSent = await sendWhatsAppAlert(message);
        if (alertSent) {
          globalThis.lastAlertTime = now;
          console.log("WhatsApp alert sent");
        }
      } catch (error) {
        console.error("Twilio Error:", error instanceof Error ? error.message : String(error));
      }
    } else {
      console.log("WhatsApp alert skipped: cooldown active.");
    }
  }

  return alertSent;
}
