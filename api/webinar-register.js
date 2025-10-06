const nodemailer = require("nodemailer");

// --- utils ---
const escapeHtml = (v = "") =>
  String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, '&quot;')
    .replace(/'/g, "&#039;");

const display = (v) => (v && String(v).trim() ? escapeHtml(v) : "Not provided");

// optional CORS
function applyCors(req, res) {
  const allowOrigin = process.env.CORS_ALLOW_ORIGIN || "";
  if (allowOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowOrigin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
}

// create transporter (Gmail/app password or switch to SMTP host/port)
function createTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

// ************* THE EXPORT VERCEL EXPECTS *************
module.exports = async (req, res) => {
  applyCors(req, res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const transporter = createTransporter();
  if (!transporter) {
    return res.status(500).json({
      success: false,
      message: "Email service not configured (EMAIL_USER/PASS).",
    });
  }

  try {
    const {
      webinarTitle,
      name,
      email,
      contact,
      companyName,
      department,
      designation,
      country,
      state,
      city,
    } = req.body || {};

    if (!name || !email || !contact) {
      return res.status(400).json({
        success: false,
        message: "Name, Email Id, and Contact are required fields.",
      });
    }

    const submittedAtIST = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    const html = `
      <h2 style="margin:0 0 8px 0;">New Webinar Registration</h2>
      <p style="margin:0 0 8px 0;color:#555;">Submitted at (IST): ${escapeHtml(submittedAtIST)}</p>
      <table cellpadding="8" cellspacing="0" border="0" style="border-collapse:collapse;background:#fff;border:1px solid #eee;">
        <tbody>
          <tr><td style="border-bottom:1px solid #eee;"><strong>Webinar Title</strong></td><td style="border-bottom:1px solid #eee;">${display(webinarTitle)}</td></tr>
          <tr><td style="border-bottom:1px solid #eee;"><strong>Name</strong></td><td style="border-bottom:1px solid #eee;">${display(name)}</td></tr>
          <tr><td style="border-bottom:1px solid #eee;"><strong>Email</strong></td><td style="border-bottom:1px solid #eee;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
          <tr><td style="border-bottom:1px solid #eee;"><strong>Contact</strong></td><td style="border-bottom:1px solid #eee;">${display(contact)}</td></tr>
          <tr><td style="border-bottom:1px solid #eee;"><strong>Company Name</strong></td><td style="border-bottom:1px solid #eee;">${display(companyName)}</td></tr>
          <tr><td style="border-bottom:1px solid #eee;"><strong>Department</strong></td><td style="border-bottom:1px solid #eee;">${display(department)}</td></tr>
          <tr><td style="border-bottom:1px solid #eee;"><strong>Designation</strong></td><td style="border-bottom:1px solid #eee;">${display(designation)}</td></tr>
          <tr><td style="border-bottom:1px solid #eee;"><strong>City</strong></td><td style="border-bottom:1px solid #eee;">${display(city)}</td></tr>
          <tr><td style="border-bottom:1px solid #eee;"><strong>State</strong></td><td style="border-bottom:1px solid #eee;">${display(state)}</td></tr>
          <tr><td style="border-bottom:1px solid #eee;"><strong>Country</strong></td><td style="border-bottom:1px solid #eee;">${display(country)}</td></tr>
        </tbody>
      </table>
    `;

    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.MAIL_TO || "info@inkarp.co.in",
      replyTo: email ? `${name} <${email}>` : undefined,
      subject: `New Webinar Registration: ${webinarTitle ? webinarTitle : "Untitled Webinar"} — ${name}`,
      html,
      text:
`New Webinar Registration
Submitted at (IST): ${submittedAtIST}
Webinar Title: ${webinarTitle || ""}
Name: ${name || ""}
Email: ${email || ""}
Contact: ${contact || ""}
Company Name: ${companyName || ""}
Department: ${department || ""}
Designation: ${designation || ""}
City: ${city || ""}
State: ${state || ""}
Country: ${country || ""}`,
    });

    return res.status(200).json({
      success: true,
      id: info && info.messageId,
      message: "Registration successful! We will send you the webinar details soon.",
    });
  } catch (err) {
    console.error("Webinar registration error:", err);
    return res.status(500).json({
      success: false,
      message: "An error occurred during registration. Please try again later.",
    });
  }
};
