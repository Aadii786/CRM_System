"use strict";

// Automation vocabulary shared by the engine (server) and the builder screens (client).

// Triggers that really fire today (each is called from the place where the event happens).
const TRIGGER_OPTIONS = [
  { value: "contact_added", label: "A contact is added" },
  { value: "form_submitted", label: "A website form is received" },
  { value: "registration_created", label: "Someone registers for a program" },
  { value: "program_completed", label: "Someone completes a program (becomes an alumnus)" },
  { value: "email_opened", label: "Someone opens a campaign email" },
  { value: "email_clicked", label: "Someone clicks a campaign link" },
  { value: "whatsapp_response", label: "Someone replies on WhatsApp" },
  { value: "deal_stage_changed", label: "An inquiry moves to another stage" },
];

const CONDITION_OPTIONS = [
  { value: "email_opened", label: "Opened the last email" },
  { value: "email_clicked", label: "Clicked a link in the last email" },
  { value: "whatsapp_reply", label: "Replied on WhatsApp" },
  { value: "is_registered", label: "Is registered for a program" },
];

const STEP_OPTIONS = [
  { value: "wait", label: "Wait" },
  { value: "send_email", label: "Send an email" },
  { value: "send_whatsapp", label: "Send a WhatsApp message" },
  { value: "create_task", label: "Create a follow-up task" },
  { value: "notify_owner", label: "Notify the contact's owner" },
  { value: "update_status", label: "Change the contact's status" },
  { value: "condition", label: "Check a condition (Yes continues, No ends)" },
];

const FORM_TYPE_OPTIONS = [
  { value: "enquiry", label: "Enquiry" },
  { value: "brochure", label: "Brochure download" },
  { value: "registration", label: "Registration" },
  { value: "feedback", label: "Feedback" },
];

module.exports = { TRIGGER_OPTIONS, CONDITION_OPTIONS, STEP_OPTIONS, FORM_TYPE_OPTIONS };
