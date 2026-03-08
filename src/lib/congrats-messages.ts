export const CONGRATS_MESSAGES = [
  "You just made Future You very proud.",
  "That's what we call a power move.",
  "Another session in the bag. You're unstoppable.",
  "Look at you, being all disciplined and stuff.",
  "The grind doesn't stop. Neither do you.",
  "Consistency is your superpower.",
  "10,000 hours? At this rate, easy.",
  "You showed up. That's 90% of the battle.",
  "Your future self just sent a thank-you note.",
  "Legend behavior. Certified.",
];

export function getRandomCongratsMessage(): string {
  return CONGRATS_MESSAGES[Math.floor(Math.random() * CONGRATS_MESSAGES.length)];
}
