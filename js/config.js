export const LINKEDIN_URL = 'https://www.linkedin.com/in/shruthianand-uxd/';
export const WHATSAPP_NUMBER = '917349079301';
export const CURRENT_EVENT = 'Women in Product, Bangalore';
export const WHITEBOARD_BIO = [
  'Product Designer',
  'AI Builder',
  'Studying at IDC School of Design, IIT Bombay',
  'Licensed Architect'
];
export const NOTEBOOK_MESSAGE = 'Leave a message for Shruthi';
export const SHOT_PROMPT = 'Easy Shot';
export const SCOREBOARD_NAME = 'Shruthi Anand';
export const BIO = {
  main: "Hi, I'm Shruthi Anand. I design products, build with AI, study interaction design at IDC IIT Bombay, and I'm a licensed architect.",
  aside: "I made this site last night so I can NET-work better. Don't be a stranger, shoot your shot.",
};

// Guestbook on the left wall. The wall panel itself is baked art (assets/textures/message-board.png);
// this is the copy for the message overlay and where messages are sent.
// FORMSPREE_FORM_ID: the ID from your Formspree form (formspree.io/f/<ID>), created under workspace.shruthi@gmail.com.
export const FORMSPREE_FORM_ID = '';
export const MESSAGE_FORM = {
  title: 'Leave Shruthi a message',
  placeholder: 'Say hi, tell her where you met, or leave your contact so she can reach back.',
  send: 'Send',
  sending: 'Sending…',
  sent: 'Sent. Thank you!',
  empty: 'Write a message first.',
  failed: "Couldn't send that. Please try again.",
  notSetUp: "Messages aren't switched on yet.",
  subject: 'New message from the Networking Room',
};

export const CONFIG = { LINKEDIN_URL, WHATSAPP_NUMBER, CURRENT_EVENT, WHITEBOARD_BIO, NOTEBOOK_MESSAGE, SHOT_PROMPT, SCOREBOARD_NAME, BIO, FORMSPREE_FORM_ID, MESSAGE_FORM };

export function getWhatsAppUrl() {
  const message = `Hey Shruthi, we met at ${CURRENT_EVENT}! My name is ___`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
