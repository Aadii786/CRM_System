import { nextElementId } from "./elements";

function el(type, x, y, width, height, props) {
  return { id: nextElementId(), type, x, y, width, height, props };
}

/**
 * Starter layouts for the drag-and-drop email builder's template gallery.
 * Every element here can be freely moved, resized and edited once loaded -
 * these are just a faster starting point than a blank canvas.
 */
export const EMAIL_TEMPLATES = [
  {
    key: "welcome",
    name: "Welcome Email",
    description: "Greeting, intro paragraph and a call-to-action button.",
    elements: () => [
      el("text", 20, 20, 560, 50, { content: "Welcome to the University!", fontSize: 26, color: "#111827", align: "left", bold: true }),
      el("text", 20, 80, 560, 90, { content: "Hi {{firstName}},\n\nWe're thrilled to have you with us. Here's what you can expect next from our team.", fontSize: 15, color: "#374151", align: "left", bold: false }),
      el("divider", 20, 180, 560, 8, { color: "#e5e7eb" }),
      el("button", 20, 210, 200, 46, { label: "Get Started", href: "https://university.edu.pk", bgColor: "#4f46e5", textColor: "#ffffff", align: "left" }),
      el("text", 20, 280, 560, 40, { content: "University Admissions Office", fontSize: 12, color: "#9ca3af", align: "left", bold: false }),
    ],
  },
  {
    key: "newsletter",
    name: "Newsletter",
    description: "Banner image, two content blocks and a button.",
    elements: () => [
      el("text", 20, 20, 560, 40, { content: "This Month at the University", fontSize: 22, color: "#111827", align: "left", bold: true }),
      el("image", 20, 70, 560, 220, { src: "", alt: "Newsletter banner", align: "left" }),
      el("text", 20, 310, 270, 110, { content: "Top story headline goes here with a short one or two line summary of the article.", fontSize: 14, color: "#374151", align: "left", bold: false }),
      el("text", 310, 310, 270, 110, { content: "Second story headline with its own short summary paragraph for readers.", fontSize: 14, color: "#374151", align: "left", bold: false }),
      el("button", 20, 430, 180, 44, { label: "Read More", href: "https://university.edu.pk", bgColor: "#4f46e5", textColor: "#ffffff", align: "left" }),
    ],
  },
  {
    key: "event",
    name: "Event Invite",
    description: "Event image, details and an RSVP button.",
    elements: () => [
      el("text", 20, 20, 560, 40, { content: "You're Invited: Open House 2026", fontSize: 22, color: "#111827", align: "center", bold: true }),
      el("image", 20, 70, 560, 240, { src: "", alt: "Event banner", align: "left" }),
      el("text", 20, 320, 560, 80, { content: "📅 Saturday, 14 March 2026\n📍 Main Campus Auditorium\n🕒 10:00 AM - 2:00 PM", fontSize: 15, color: "#374151", align: "center", bold: false }),
      el("button", 220, 410, 200, 46, { label: "RSVP Now", href: "https://university.edu.pk/rsvp", bgColor: "#16a34a", textColor: "#ffffff", align: "center" }),
    ],
  },
  {
    key: "promo",
    name: "Promotional",
    description: "Bold headline, offer image, discount copy and CTA.",
    elements: () => [
      el("text", 20, 20, 560, 50, { content: "Limited-Time Scholarship Offer", fontSize: 26, color: "#111827", align: "center", bold: true }),
      el("image", 20, 80, 560, 200, { src: "", alt: "Promo banner", align: "left" }),
      el("text", 20, 300, 560, 60, { content: "Apply before 30 September and save up to 25% on tuition fees for the Fall 2026 intake.", fontSize: 15, color: "#374151", align: "center", bold: false }),
      el("button", 210, 370, 220, 48, { label: "Apply Now", href: "https://university.edu.pk/apply", bgColor: "#dc2626", textColor: "#ffffff", align: "center" }),
      el("divider", 20, 440, 560, 8, { color: "#e5e7eb" }),
      el("text", 20, 460, 560, 30, { content: "Terms and conditions apply.", fontSize: 11, color: "#9ca3af", align: "center", bold: false }),
    ],
  },
];
