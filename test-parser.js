// Test script to verify PDF parsing
// Run with: node test-parser.js

const fs = require('fs');
const path = require('path');

// This is a simple test to check if the PDF file exists and can be read
// The actual parsing will be tested in the browser/Next.js app

const pdfPath = path.join(__dirname, 'test-docs', 'AuthenticatedStatement.pdf');

if (fs.existsSync(pdfPath)) {
  const stats = fs.statSync(pdfPath);
  console.log('✓ PDF file found');
  console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`  Path: ${pdfPath}`);
  console.log('\nTo test parsing:');
  console.log('1. Start the Next.js dev server: npm run dev');
  console.log('2. Navigate to http://localhost:3000/app');
  console.log('3. Upload the AuthenticatedStatement.pdf file');
  console.log('4. Check the browser console for parsing logs');
} else {
  console.error('✗ PDF file not found at:', pdfPath);
  process.exit(1);
}

