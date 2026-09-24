export const LINKEDIN_URL = 'https://www.linkedin.com/in/shruthianand-uxd/';
export const WHATSAPP_NUMBER = '917349079301';
export const CURRENT_EVENT = 'the networking room';
export const WHITEBOARD_BIO = [
  'Product Designer',
  'AI Builder',
  'Studying at IDC School of Design, IIT Bombay',
  'Licensed Architect'
];
export const NOTEBOOK_MESSAGE = 'Leave a message for Shruthi';
export const SHOT_PROMPT = 'Easy Shot';
export const SCOREBOARD_NAME = 'Shruthi Anand';

export const CONFIG = { LINKEDIN_URL, WHATSAPP_NUMBER, CURRENT_EVENT, WHITEBOARD_BIO, NOTEBOOK_MESSAGE, SHOT_PROMPT, SCOREBOARD_NAME };

export function getWhatsAppUrl() {
  const message = `Hey Shruthi, we met at ${CURRENT_EVENT}. My name is ___`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
