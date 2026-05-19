import twilio from "twilio";

const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_FROM_NUMBER;
const client = sid && token ? twilio(sid, token) : null;

export const notifyContactsBySMS = async (phones, message) => {
  if (!client || !from) {
    console.log("Twilio not configured; skipping SMS.", { phones, message });
    return;
  }

  await Promise.all(
    phones.map((to) =>
      client.messages.create({
        body: message,
        from,
        to,
      })
    )
  );
};
