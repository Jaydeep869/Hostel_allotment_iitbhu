// ============================================================
// PDF Generator — Allotment Slip with QR Code
// ============================================================
// Generates a professional PDF allotment slip using PDFKit.
//
// WHAT'S ON THE SLIP:
//   - IIT BHU header
//   - Student details (name, email, branch, year)
//   - Room details (hostel name, room number)
//   - Allotment date
//   - QR code linking to verification endpoint
//
// WHY PDFKit?
//   - Lightweight (no Chrome/Puppeteer needed)
//   - Runs on any Node.js server
//   - Produces clean, small PDFs
//
// USAGE:
//   const pdfBuffer = await generateAllotmentSlip(data);
//   res.setHeader('Content-Type', 'application/pdf');
//   res.send(pdfBuffer);
// ============================================================

const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

/**
 * Generates a PDF allotment slip as a Buffer.
 *
 * @param {object} data
 * @param {string} data.studentName
 * @param {string} data.email
 * @param {string} data.branch
 * @param {number} data.year
 * @param {string} data.hostelName
 * @param {string} data.roomNumber
 * @param {string} data.allotmentId
 * @param {string} data.allottedAt    — ISO date string
 * @param {string} data.verifyUrl     — Full URL for QR code
 * @returns {Promise<Buffer>}
 */
async function generateAllotmentSlip(data) {
  return new Promise(async (resolve, reject) => {
    try {
      // Generate QR code as a data URL (base64 PNG)
      const qrDataUrl = await QRCode.toDataURL(data.verifyUrl, {
        width: 150,
        margin: 1,
        color: { dark: "#1a1a2e", light: "#ffffff" },
      });

      // Convert data URL to buffer for PDFKit
      const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");

      // Create PDF document
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: "Hostel Allotment Slip",
          Author: "IIT (BHU) Varanasi",
        },
      });

      // Collect PDF chunks into a buffer
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width - 100; // 50 margin each side

      // ---------- Header ----------
      doc
        .fontSize(10)
        .fillColor("#666666")
        .text("INDIAN INSTITUTE OF TECHNOLOGY", { align: "center" })
        .fontSize(18)
        .fillColor("#1a1a2e")
        .text("(BHU) VARANASI", { align: "center" })
        .moveDown(0.3)
        .fontSize(9)
        .fillColor("#888888")
        .text("Department of Student Affairs — Hostel Administration", {
          align: "center",
        })
        .moveDown(0.5);

      // Divider line
      const dividerY = doc.y;
      doc
        .moveTo(50, dividerY)
        .lineTo(50 + pageWidth, dividerY)
        .strokeColor("#1a1a2e")
        .lineWidth(2)
        .stroke();

      doc.moveDown(0.8);

      // ---------- Title ----------
      doc
        .fontSize(16)
        .fillColor("#1a1a2e")
        .text("HOSTEL ALLOTMENT SLIP", { align: "center" })
        .moveDown(0.3)
        .fontSize(9)
        .fillColor("#999999")
        .text(`Slip ID: ${data.allotmentId}`, { align: "center" })
        .moveDown(1.5);

      // ---------- Student Details ----------
      const labelX = 70;
      const valueX = 230;
      const lineHeight = 24;

      function addRow(label, value) {
        const y = doc.y;
        doc
          .fontSize(10)
          .fillColor("#666666")
          .text(label, labelX, y)
          .fontSize(11)
          .fillColor("#1a1a2e")
          .text(value || "—", valueX, y);
        doc.y = y + lineHeight;
      }

      doc
        .fontSize(12)
        .fillColor("#4361ee")
        .text("STUDENT DETAILS", labelX, doc.y)
        .moveDown(0.5);

      addRow("Name", data.studentName);
      addRow("Email", data.email);
      addRow("Branch", data.branch);
      addRow("Year", `${data.year}${getOrdinalSuffix(data.year)} Year`);

      doc.moveDown(1);

      // Thin divider
      doc
        .moveTo(70, doc.y)
        .lineTo(70 + pageWidth - 40, doc.y)
        .strokeColor("#dddddd")
        .lineWidth(0.5)
        .stroke();

      doc.moveDown(1);

      // ---------- Room Details ----------
      doc
        .fontSize(12)
        .fillColor("#4361ee")
        .text("ROOM DETAILS", labelX, doc.y)
        .moveDown(0.5);

      addRow("Hostel", data.hostelName);
      addRow("Room Number", data.roomNumber);
      addRow(
        "Allotted On",
        new Date(data.allottedAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      );

      doc.moveDown(1.5);

      // ---------- QR Code ----------
      const qrX = (doc.page.width - 120) / 2;
      doc.image(qrBuffer, qrX, doc.y, { width: 120, height: 120 });
      doc.y += 130;

      doc
        .fontSize(8)
        .fillColor("#999999")
        .text("Scan to verify allotment authenticity", { align: "center" })
        .moveDown(3);

      // ---------- Footer ----------
      const footerY = doc.page.height - 100;

      doc
        .moveTo(50, footerY)
        .lineTo(50 + pageWidth, footerY)
        .strokeColor("#dddddd")
        .lineWidth(0.5)
        .stroke();

      doc
        .fontSize(8)
        .fillColor("#999999")
        .text(
          "This is a computer-generated document. No signature is required.",
          50,
          footerY + 10,
          { align: "center", width: pageWidth }
        )
        .text(
          `Generated on ${new Date().toLocaleString("en-IN")} | IIT (BHU) Varanasi`,
          50,
          footerY + 24,
          { align: "center", width: pageWidth }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Returns ordinal suffix: 1→"st", 2→"nd", 3→"rd", 4→"th"
 */
function getOrdinalSuffix(n) {
  if (n === 1) return "st";
  if (n === 2) return "nd";
  if (n === 3) return "rd";
  return "th";
}

module.exports = { generateAllotmentSlip };
