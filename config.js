// Deployment settings. Leave endpoint empty = DEMO mode (validates only; nothing is sent or stored, and no success is claimed).
// To go live: set endpoint to the HTTPS URL that returns {ok:true, ref} only after the response was really saved
// (e.g. the Apps Script /exec URL, or "/api/submit" on a host that runs api/submit.js).
window.TK_CONFIG = { endpoint: "" };
