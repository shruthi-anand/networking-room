export const CONFIG = {
  currentEvent: 'the networking room',
  linkedinUrl: 'https://www.linkedin.com/in/shruthianand-uxd/',
  whatsappNumber: '917349079301',
  whiteboardBio: [
    'Product Designer',
    'AI Builder',
    'Studying at IDC School of Design, IIT Bombay',
    'Licensed Architect'
  ]
};

export function getWhatsAppUrl() {
  const message = `Hey Shruthi, we met at ${CONFIG.currentEvent}. My name is ___`;
  return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
