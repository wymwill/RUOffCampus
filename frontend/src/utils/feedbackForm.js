const MAX_MESSAGE_LENGTH = 4000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Returns { message, email } ready for the API, or { error } for the form.
export function buildFeedbackPayload({ message, email }) {
  const trimmedMessage = (message ?? "").trim();
  if (!trimmedMessage) {
    return { error: "Tell us what's on your mind first." };
  }
  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    return { error: `Keep it under ${MAX_MESSAGE_LENGTH} characters.` };
  }

  const trimmedEmail = (email ?? "").trim();
  if (trimmedEmail && !EMAIL_PATTERN.test(trimmedEmail)) {
    return { error: "That email doesn't look right." };
  }

  return { message: trimmedMessage, email: trimmedEmail || null };
}
