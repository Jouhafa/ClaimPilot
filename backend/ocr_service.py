#!/usr/bin/env python3
"""
PDF OCR Service using PyMuPDF and Tesseract
This service can be called from the Node.js backend to extract text from PDFs
that have garbled text extraction issues.
"""

import sys
import json
import fitz  # PyMuPDF
import pytesseract
import cv2
import numpy as np
from io import BytesIO
import base64

def preprocess(img_bgr):
    """Preprocess image for better OCR results"""
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.bilateralFilter(gray, 7, 40, 40)
    # Adaptive threshold usually helps for scanned statements
    th = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 31, 11
    )
    return th

def extract_text_from_pdf(pdf_path_or_data):
    """Extract text from PDF using OCR"""
    # Open PDF (can be file path or bytes)
    if isinstance(pdf_path_or_data, bytes):
        doc = fitz.open(stream=pdf_path_or_data, filetype="pdf")
    else:
        doc = fitz.open(pdf_path_or_data)
    
    all_pages_text = []
    for i in range(len(doc)):
        page = doc[i]
        # Render at higher resolution
        mat = fitz.Matrix(3, 3)  # ~216 DPI (increase to 4,4 for more)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
        img_bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        
        th = preprocess(img_bgr)
        
        # Arabic + English OCR (requires ara language installed)
        text = pytesseract.image_to_string(th, lang="ara+eng", config="--psm 6")
        all_pages_text.append(text)
    
    doc.close()
    
    full_text = "\n\n--- PAGE BREAK ---\n\n".join(all_pages_text)
    return full_text

if __name__ == "__main__":
    # Read from stdin (expects base64-encoded PDF or file path)
    input_data = sys.stdin.read().strip()
    
    try:
        # Try to decode as base64 first
        try:
            pdf_bytes = base64.b64decode(input_data)
            text = extract_text_from_pdf(pdf_bytes)
        except:
            # If not base64, treat as file path
            text = extract_text_from_pdf(input_data)
        
        # Output as JSON
        result = {
            "success": True,
            "text": text,
            "length": len(text)
        }
        print(json.dumps(result))
    except Exception as e:
        result = {
            "success": False,
            "error": str(e),
            "text": "",
            "length": 0
        }
        print(json.dumps(result))
        sys.exit(1)

