// pdfParser.js — Extracts plain text from a PDF File object
// Uses pdf.js loaded from CDN (no npm install needed)
// This runs entirely in the browser — your PDF never leaves the device.

// pdf.js needs a "worker" file to process PDFs in a background thread.
// We load both from a CDN so we don't need to install anything.
const PDFJS_VERSION = "3.11.174";
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

// Load pdf.js script dynamically (only once)
function loadPdfJs() {
    return new Promise((resolve, reject) => {
        // If already loaded, just resolve
        if (window.pdfjsLib) return resolve(window.pdfjsLib);

        const script = document.createElement("script");
        script.src = `${PDFJS_CDN}/pdf.min.js`;
        script.onload = () => {
            // Tell pdf.js where its worker file lives
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.js`;
            resolve(window.pdfjsLib);
        };
        script.onerror = () => reject(new Error("Failed to load pdf.js"));
        document.head.appendChild(script);
    });
}

// ─── MAIN EXPORT: extractTextFromPDF ─────────────────────────────────────────
// Takes: a File object (from a file input or drag-and-drop)
// Returns: a plain text string of all text in the PDF
export async function extractTextFromPDF(file) {
    // Step 1: Load pdf.js library
    const pdfjsLib = await loadPdfJs();

    // Step 2: Read the file as an ArrayBuffer (raw binary data)
    // FileReader is the browser API for reading files
    const arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });

    // Step 3: Load the PDF document from the binary data
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    // Step 4: Loop through every page and extract text
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);

        // getTextContent returns an object with "items" array
        // Each item has a "str" property with the text
        const textContent = await page.getTextContent();

        // Join all text items on this page
        // We add spaces between items to avoid words running together
        const pageText = textContent.items
            .map((item) => item.str)
            .join(" ")
            .replace(/\s+/g, " ") // collapse multiple spaces
            .trim();

        fullText += pageText + "\n\n"; // double newline between pages
    }

    if (!fullText.trim()) {
        throw new Error(
            "No text could be extracted from this PDF. It might be a scanned image. Try a text-based PDF."
        );
    }

    return fullText.trim();
}