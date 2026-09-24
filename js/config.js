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
  // Right-wall text, in styled pieces: plain pieces are solid regular white type; accent pieces glow softly in the
  // hoop's orange and pulse; outline: true would draw a piece as a heavy outline; newLine starts it on its own line.
  aside: [
    { text: "I made this site last night so I can NET-work better. Don't be a stranger," },
    { text: 'Shoot your shot.', accent: true, newLine: true },
  ],
};

// Guestbook on the left wall. The wall panel itself is baked art (assets/textures/message-board.png);
// this is the copy for the message overlay and where messages are sent.
// FORMSPREE_FORM_ID: the ID from the Formspree form (formspree.io/f/<ID>); messages are delivered to shruthianand0603@gmail.com.
export const FORMSPREE_FORM_ID = 'xwlpqrqo';
export const MESSAGE_FORM = {
  title: 'Leave a Message',
  nameLabel: 'Name',
  namePlaceholder: 'Your name',
  contactLabel: 'Email or LinkedIn',
  contactPlaceholder: 'you@email.com or linkedin.com/in/you',
  messageLabel: 'Message (optional)',
  messagePlaceholder: 'Say hi, or tell her where you met.',
  send: 'Send',
  sending: 'Sending…',
  sent: 'Sent. Thank you!',
  needName: 'Add your name.',
  needContact: 'Add your email or LinkedIn.',
  badContact: "That doesn't look like an email or a LinkedIn link.",
  failed: "Couldn't send that. Please try again.",
  notSetUp: "Messages aren't switched on yet.",
  subject: 'New message from the Networking Room',
};

export const CONFIG = { LINKEDIN_URL, WHATSAPP_NUMBER, CURRENT_EVENT, WHITEBOARD_BIO, NOTEBOOK_MESSAGE, SHOT_PROMPT, SCOREBOARD_NAME, BIO, FORMSPREE_FORM_ID, MESSAGE_FORM };

export function getWhatsAppUrl() {
  const message = `Hey Shruthi, we met at ${CURRENT_EVENT}! My name is ___`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
