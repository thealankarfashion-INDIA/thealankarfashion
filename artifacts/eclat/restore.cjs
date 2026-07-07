const fs = require('fs');
const log = fs.readFileSync('/Users/gopinathk/.gemini/antigravity/brain/e290959e-44b9-4614-b3c7-d244de793da6/.system_generated/logs/overview.txt', 'utf8');

const startMarker = "The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.\n1: import { useState, useEffect } from \"react\";\n2: import { motion, AnimatePresence } from \"framer-motion\";";

const startIndex = log.indexOf(startMarker);
if (startIndex !== -1) {
  const contentStart = startIndex + startMarker.split('\n')[0].length + 1;
  const endIndex = log.indexOf("The above content shows the entire, complete file contents of the requested file.", contentStart);
  
  if (endIndex !== -1) {
    let extracted = log.substring(contentStart, endIndex).trim();
    // remove the "line_number: " prefix
    extracted = extracted.split('\n').map(line => {
      const match = line.match(/^\d+:\s(.*)$/);
      return match ? match[1] : line;
    }).join('\n');
    
    fs.writeFileSync('src/pages/admin/AdminDashboard.tsx', extracted);
    console.log("Restored successfully!");
  } else {
    console.log("End marker not found");
  }
} else {
  console.log("Start marker not found");
}
