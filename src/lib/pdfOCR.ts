/**
 * PDF OCR extraction using Tesseract.js
 * Production-ready implementation with:
 * - Language-keyed worker cache (Arabic + English support)
 * - Fast O(n) preprocessing (Otsu threshold)
 * - Canvas cropping to table region
 * - Real Tesseract progress updates
 * - Better cancellation handling
 * - Proper error handling
 */

import type { Worker } from "tesseract.js";
import { PSM } from "tesseract.js";

export interface OCRProgress {
  page: number;
  totalPages: number;
  progress: number;
  status: string;
}

export type OCRProgressCallback = (progress: OCRProgress) => void;

export interface OCROptions {
  langs?: string; // default "ara+eng"
  renderScale?: number; // default 4.0
  crop?: { top: number; left: number; right: number; bottom: number }; // percentages 0..1
}

// Language-keyed worker cache
const workers = new Map<string, Worker>();
const initialized = new Set<string>();

// Per-page OCR progress tracking
let currentPage = 0;
let currentOcrProgress = 0;
let lastProgressUpdate = 0;

/**
 * Initialize Tesseract worker for a specific language (reuse across pages for performance)
 */
async function getTesseractWorker(
  langs: string = "ara+eng",
  onLogger?: (m: any) => void
): Promise<Worker> {
  // Return cached worker if available
  if (workers.has(langs) && initialized.has(langs)) {
    return workers.get(langs)!;
  }

  try {
    const Tesseract = (await import("tesseract.js")).default;
    
    let worker: Worker;
    try {
      // Try with requested language(s)
      worker = await Tesseract.createWorker(langs, 1, {
        logger: onLogger || ((m: any) => {
          // Only log errors and important progress
          if (m.status === "recognizing text") {
            const progress = m.progress || 0;
            // Throttle updates (only emit when progress changes by >= 2%)
            if (Math.abs(progress - lastProgressUpdate) >= 0.02 || progress === 1.0) {
              lastProgressUpdate = progress;
              currentOcrProgress = progress;
            }
          }
        }),
      });
      
      // Set parameters for tabular text (block of text mode)
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK, // Uniform block of text
      });
    } catch (optionsError) {
      // If Arabic requested but fails, fallback to English
      if (langs.includes("ara")) {
        console.warn(`Failed to create worker with "${langs}", falling back to "eng":`, optionsError);
        try {
          worker = await Tesseract.createWorker("eng", 1, {
            logger: onLogger || ((m: any) => {
              if (m.status === "recognizing text") {
                const progress = m.progress || 0;
                if (Math.abs(progress - lastProgressUpdate) >= 0.02 || progress === 1.0) {
                  lastProgressUpdate = progress;
                  currentOcrProgress = progress;
                }
              }
            }),
          });
          await worker.setParameters({
            tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
          });
        } catch (engError) {
          console.error("Failed to create English worker:", engError);
          throw new Error(`OCR initialization failed: ${engError instanceof Error ? engError.message : String(engError)}`);
        }
      } else {
        throw optionsError;
      }
    }

    workers.set(langs, worker);
    initialized.add(langs);
    return worker;
  } catch (error) {
    console.error("Failed to create Tesseract worker:", error);
    throw new Error(`OCR initialization failed: ${error instanceof Error ? error.message : String(error)}. Please ensure tesseract.js is properly installed.`);
  }
}

/**
 * Cleanup worker(s) (call when done processing)
 */
export async function cleanupOCRWorker(langs?: string) {
  if (langs) {
    // Cleanup specific language worker
    const worker = workers.get(langs);
    if (worker) {
      await worker.terminate();
      workers.delete(langs);
      initialized.delete(langs);
    }
  } else {
    // Cleanup all workers
    for (const [lang, worker] of workers.entries()) {
      await worker.terminate();
    }
    workers.clear();
    initialized.clear();
  }
}

/**
 * Crop canvas to a specific region (percentages 0..1)
 */
function cropCanvasToRegion(
  canvas: HTMLCanvasElement,
  region: { top: number; left: number; right: number; bottom: number }
): HTMLCanvasElement {
  const width = canvas.width;
  const height = canvas.height;
  
  const left = Math.floor(region.left * width);
  const top = Math.floor(region.top * height);
  const right = Math.floor(region.right * width);
  const bottom = Math.floor(region.bottom * height);
  
  const croppedWidth = right - left;
  const croppedHeight = bottom - top;
  
  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = croppedWidth;
  croppedCanvas.height = croppedHeight;
  
  const ctx = croppedCanvas.getContext("2d");
  if (ctx) {
    ctx.drawImage(
      canvas,
      left, top, croppedWidth, croppedHeight,
      0, 0, croppedWidth, croppedHeight
    );
  }
  
  return croppedCanvas;
}

/**
 * Fast preprocessing for OCR using Otsu threshold (O(n) instead of O(n*k²))
 */
function preprocessImageForOCRFast(imageData: ImageData): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const newData = new Uint8ClampedArray(data.length);
  
  // 1) Convert to grayscale
  const grayData = new Uint8ClampedArray(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    grayData[i / 4] = gray;
  }
  
  // 2) Contrast normalization using min/max percentiles (2% and 98%)
  const sorted = Array.from(grayData).sort((a, b) => a - b);
  const minPercentile = sorted[Math.floor(sorted.length * 0.02)] || 0;
  const maxPercentile = sorted[Math.floor(sorted.length * 0.98)] || 255;
  const range = maxPercentile - minPercentile || 1;
  
  const normalized = new Uint8ClampedArray(width * height);
  for (let i = 0; i < grayData.length; i++) {
    const value = grayData[i];
    normalized[i] = Math.max(0, Math.min(255, Math.round(((value - minPercentile) / range) * 255)));
  }
  
  // 3) Compute Otsu threshold from histogram
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < normalized.length; i++) {
    histogram[normalized[i]]++;
  }
  
  let sum = 0;
  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVariance = 0;
  let threshold = 128;
  
  const totalPixels = normalized.length;
  
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
  }
  
  for (let i = 0; i < 256; i++) {
    wB += histogram[i];
    if (wB === 0) continue;
    
    wF = totalPixels - wB;
    if (wF === 0) break;
    
    sumB += i * histogram[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    
    const variance = wB * wF * (mB - mF) * (mB - mF);
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = i;
    }
  }
  
  // 4) Binarize to 0/255
  // Optional: check if background is dark (invert if needed)
  const avgIntensity = sum / totalPixels;
  const shouldInvert = avgIntensity < 128;
  
  for (let i = 0; i < normalized.length; i++) {
    const pixel = normalized[i];
    const binary = (pixel > threshold) ? 255 : 0;
    const finalValue = shouldInvert ? 255 - binary : binary;
    
    const idx = i * 4;
    newData[idx] = finalValue;
    newData[idx + 1] = finalValue;
    newData[idx + 2] = finalValue;
    newData[idx + 3] = 255;
  }
  
  return new ImageData(newData, width, height);
}

/**
 * Normalize OCR text output (Arabic-Indic digits, whitespace, etc.)
 */
function normalizeOCRText(raw: string): string {
  // Normalize Arabic-Indic digits to Western digits
  const digitMap: Record<string, string> = {
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9"
  };
  
  let text = raw.replace(/[٠-٩]/g, (d) => digitMap[d] ?? d);
  
  // Collapse whitespace (but preserve line breaks)
  text = text.replace(/[ \t]+/g, " ");
  
  // Collapse repeated blank lines (max 2 consecutive)
  text = text.replace(/\n{3,}/g, "\n\n");
  
  return text.trim();
}

/**
 * Extract text from PDF using OCR (Tesseract.js)
 * Production-ready with progress callbacks, fast preprocessing, and cropping
 * Returns per-page text array and combined text
 */
export async function extractPDFTextWithOCR(
  file: File,
  onProgress?: OCRProgressCallback,
  signal?: AbortSignal,
  options?: OCROptions
): Promise<{ pages: string[]; combined: string }> {
  try {
    // Default options
    const opts: Required<OCROptions> = {
      langs: options?.langs || "ara+eng",
      renderScale: options?.renderScale || 4.0,
      crop: options?.crop || { top: 0.22, left: 0.05, right: 0.95, bottom: 0.92 },
    };
    
    // Ensure PDF.js worker path is correct for production
    const pdfjsLib = await import("pdfjs-dist");
    
    if (typeof window !== "undefined") {
      const baseUrl = window.location.origin;
      pdfjsLib.GlobalWorkerOptions.workerSrc = `${baseUrl}/pdf.worker.min.mjs`;
    } else {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    }
    
    if (signal?.aborted) {
      throw new Error("OCR cancelled by user");
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;
    
    // Reset progress tracking
    currentPage = 0;
    currentOcrProgress = 0;
    lastProgressUpdate = 0;
    
    // Initialize OCR worker with language support
    let worker: Worker;
    try {
      // Create logger that updates progress
      const logger = (m: any) => {
        if (m.status === "recognizing text") {
          const progress = m.progress || 0;
          // Throttle updates (only emit when progress changes by >= 2%)
          if (Math.abs(progress - lastProgressUpdate) >= 0.02 || progress === 1.0) {
            lastProgressUpdate = progress;
            currentOcrProgress = progress;
            
            // Calculate overall progress
            const renderWeight = 0.15; // 15% for rendering
            const pageBase = (currentPage - 1) / totalPages;
            const pageWeight = (1 - renderWeight) / totalPages;
            const overallProgress = renderWeight + (pageBase + progress * pageWeight);
            
            onProgress?.({
              page: currentPage,
              totalPages,
              progress: overallProgress,
              status: `OCR page ${currentPage}/${totalPages}: ${Math.round(progress * 100)}%`,
            });
          }
        }
      };
      
      worker = await getTesseractWorker(opts.langs, logger);
    } catch (error) {
      console.error("Failed to initialize Tesseract worker:", error);
      throw new Error(`Failed to initialize OCR: ${error instanceof Error ? error.message : String(error)}`);
    }
  
    const pageTexts: string[] = [];
    let allText = "";
    const renderWeight = 0.15; // 15% of total progress for rendering
  
    // Process each page
    for (let i = 1; i <= totalPages; i++) {
      if (signal?.aborted) {
        await cleanupOCRWorker(opts.langs);
        throw new Error("OCR cancelled by user");
      }

      currentPage = i;
      
      // Rendering progress (15% of total)
      onProgress?.({
        page: i,
        totalPages,
        progress: ((i - 1) / totalPages) * renderWeight,
        status: `Rendering page ${i}/${totalPages}...`,
      });

      if (signal?.aborted) {
        await cleanupOCRWorker(opts.langs);
        throw new Error("OCR cancelled by user");
      }

      const page = await pdf.getPage(i);
      
      // Render at specified scale
      const viewport = page.getViewport({ scale: opts.renderScale });
      
      // Create canvas
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        console.warn(`Failed to get canvas context for page ${i}`);
        continue;
      }
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Render PDF page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      }).promise;
      
      if (signal?.aborted) {
        await cleanupOCRWorker(opts.langs);
        throw new Error("OCR cancelled by user");
      }
      
      // Crop to table region if specified
      let canvasToProcess = canvas;
      if (opts.crop) {
        canvasToProcess = cropCanvasToRegion(canvas, opts.crop);
      }
      
      // Preprocess image for better OCR (fast O(n) method)
      const imageData = canvasToProcess.getContext("2d")!.getImageData(0, 0, canvasToProcess.width, canvasToProcess.height);
      const processedImageData = preprocessImageForOCRFast(imageData);
      
      // Create processed canvas
      const processedCanvas = document.createElement("canvas");
      processedCanvas.width = canvasToProcess.width;
      processedCanvas.height = canvasToProcess.height;
      const processedContext = processedCanvas.getContext("2d");
      if (processedContext) {
        processedContext.putImageData(processedImageData, 0, 0);
      }
      
      if (signal?.aborted) {
        await cleanupOCRWorker(opts.langs);
        throw new Error("OCR cancelled by user");
      }
      
      // Convert to blob for OCR (with fallback for null)
      let blob: Blob;
      const canvasBlob = await new Promise<Blob | null>((resolve) => {
        processedCanvas.toBlob((blob) => resolve(blob), "image/png");
      });
      
      if (!canvasBlob) {
        // Fallback: use toDataURL and convert to blob
        const dataUrl = processedCanvas.toDataURL("image/png");
        const response = await fetch(dataUrl);
        blob = await response.blob();
      } else {
        blob = canvasBlob;
      }
      
      // Don't OCR empty blobs
      if (blob.size === 0) {
        console.warn(`Empty blob for page ${i}, skipping OCR`);
        continue;
      }

      try {
        // Perform OCR
        const { data: { text } } = await worker.recognize(blob);
        
        if (text && text.trim().length > 0) {
          const normalized = normalizeOCRText(text);
          pageTexts.push(normalized);
          allText += `\n--- Page ${i} ---\n${normalized}\n`;
        } else {
          pageTexts.push(""); // Empty page
        }
      } catch (error) {
        console.error(`OCR failed for page ${i}:`, error);
        // Continue with other pages
      }
      
      if (signal?.aborted) {
        await cleanupOCRWorker(opts.langs);
        throw new Error("OCR cancelled by user");
      }
    }
  
    onProgress?.({
      page: totalPages,
      totalPages,
      progress: 1.0,
      status: "OCR complete",
    });

    return {
      pages: pageTexts,
      combined: normalizeOCRText(allText),
    };
  } catch (error) {
    console.error("OCR extraction failed:", error);
    throw error;
  }
}

/**
 * Extract text from an image file (screenshot/photo) using OCR
 * Supports common image formats: PNG, JPEG, WebP
 */
export async function extractImageTextWithOCR(
  file: File,
  onProgress?: OCRProgressCallback,
  signal?: AbortSignal,
  options?: OCROptions
): Promise<string> {
  try {
    // Default options
    const opts: Required<OCROptions> = {
      langs: options?.langs || "ara+eng",
      renderScale: options?.renderScale || 4.0,
      crop: options?.crop || { top: 0, left: 0, right: 1, bottom: 1 }, // Full image by default
    };

    if (signal?.aborted) {
      throw new Error("OCR cancelled by user");
    }

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      throw new Error(`Unsupported image type: ${file.type}. Supported: PNG, JPEG, WebP`);
    }

    // Load image
    const imageUrl = URL.createObjectURL(file);
    const img = new Image();
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = imageUrl;
    });

    // Create canvas
    const canvas = document.createElement("canvas");
    const scale = opts.renderScale;
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    // Draw image to canvas with scaling
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(imageUrl);

    onProgress?.({
      page: 1,
      totalPages: 1,
      progress: 0.2,
      status: "Image loaded, preprocessing...",
    });

    // Crop if needed
    let canvasToProcess = canvas;
    if (opts.crop && (opts.crop.top > 0 || opts.crop.left > 0 || opts.crop.right < 1 || opts.crop.bottom < 1)) {
      const cropRegion = {
        top: Math.floor(canvas.height * opts.crop.top),
        left: Math.floor(canvas.width * opts.crop.left),
        right: Math.floor(canvas.width * opts.crop.right),
        bottom: Math.floor(canvas.height * opts.crop.bottom),
      };
      canvasToProcess = cropCanvasToRegion(canvas, cropRegion);
    }

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvasToProcess.width, canvasToProcess.height);

    onProgress?.({
      page: 1,
      totalPages: 1,
      progress: 0.4,
      status: "Preprocessing image...",
    });

    // Preprocess image for better OCR
    const processedImageData = preprocessImageForOCRFast(imageData);

    // Create processed canvas
    const processedCanvas = document.createElement("canvas");
    processedCanvas.width = canvasToProcess.width;
    processedCanvas.height = canvasToProcess.height;
    const processedContext = processedCanvas.getContext("2d");
    if (processedContext) {
      processedContext.putImageData(processedImageData, 0, 0);
    }

    if (signal?.aborted) {
      await cleanupOCRWorker(opts.langs);
      throw new Error("OCR cancelled by user");
    }

    // Convert to blob for OCR
    const blob = await new Promise<Blob | null>((resolve) => {
      processedCanvas.toBlob((blob) => resolve(blob), "image/png");
    });

    if (!blob || blob.size === 0) {
      throw new Error("Failed to process image for OCR");
    }

    onProgress?.({
      page: 1,
      totalPages: 1,
      progress: 0.6,
      status: "Running OCR...",
    });

    // Initialize OCR worker
    const worker = await getTesseractWorker(opts.langs, (m: any) => {
      if (m.status === "recognizing text") {
        const progress = m.progress || 0;
        onProgress?.({
          page: 1,
          totalPages: 1,
          progress: 0.6 + progress * 0.4, // 60-100% range
          status: `Recognizing text... ${Math.round(progress * 100)}%`,
        });
      }
    });

    // Perform OCR
    const { data: { text } } = await worker.recognize(blob);

    onProgress?.({
      page: 1,
      totalPages: 1,
      progress: 1.0,
      status: "OCR complete",
    });

    return normalizeOCRText(text);
  } catch (error) {
    console.error("Image OCR extraction failed:", error);
    throw error;
  }
}
