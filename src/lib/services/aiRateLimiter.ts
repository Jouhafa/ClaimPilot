/**
 * Rate Limiter for AI API calls
 * Prevents hitting Gemini API rate limits (5 requests/minute on free tier)
 */

interface QueuedRequest {
  id: string;
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  retries: number;
  delay: number;
}

class AIRateLimiter {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private lastRequestTime = 0;
  private readonly minDelay = 12000; // 12 seconds between requests (5 per minute = 60/5 = 12s)
  private readonly maxRetries = 3;
  private readonly retryDelay = 5000; // 5 seconds initial retry delay

  /**
   * Queue a request with rate limiting
   */
  async queueRequest<T>(
    id: string,
    requestFn: () => Promise<T>,
    retries = 0
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        id,
        execute: requestFn,
        resolve,
        reject,
        retries,
        delay: retries > 0 ? this.retryDelay * Math.pow(2, retries - 1) : 0, // Exponential backoff
      });

      this.processQueue();
    });
  }

  /**
   * Process the queue with rate limiting
   */
  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift()!;

      // Apply delay if needed (for retries or rate limiting)
      if (request.delay > 0) {
        await this.delay(request.delay);
      }

      // Ensure minimum time between requests
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.minDelay) {
        await this.delay(this.minDelay - timeSinceLastRequest);
      }

      try {
        const result = await request.execute();
        this.lastRequestTime = Date.now();
        request.resolve(result);
      } catch (error: any) {
        // Handle rate limit errors (429)
        if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota')) {
          if (request.retries < this.maxRetries) {
            // Extract retry delay from error if available
            const retryAfter = this.extractRetryAfter(error);
            const delay = retryAfter || this.retryDelay * Math.pow(2, request.retries);
            
            console.log(`Rate limit hit for ${request.id}, retrying after ${delay}ms (attempt ${request.retries + 1}/${this.maxRetries})`);
            
            // Re-queue with increased retry count
            this.queue.push({
              ...request,
              retries: request.retries + 1,
              delay,
            });
          } else {
            console.error(`Max retries exceeded for ${request.id}`);
            request.reject(new Error('Rate limit exceeded. Please try again later.'));
          }
        } else {
          // Non-rate-limit error, reject immediately
          request.reject(error);
        }
      }
    }

    this.processing = false;
  }

  /**
   * Extract retry delay from error message
   */
  private extractRetryAfter(error: any): number | null {
    try {
      const errorStr = JSON.stringify(error);
      const retryMatch = errorStr.match(/retry.*?(\d+)\s*s/i);
      if (retryMatch) {
        return parseInt(retryMatch[1]) * 1000;
      }
      
      // Check for RetryInfo in error details
      if (error?.details) {
        for (const detail of error.details) {
          if (detail['@type']?.includes('RetryInfo') && detail.retryDelay) {
            return parseInt(detail.retryDelay) * 1000;
          }
        }
      }
    } catch {
      // Ignore parsing errors
    }
    return null;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear the queue
   */
  clear() {
    this.queue.forEach(req => {
      req.reject(new Error('Request queue cleared'));
    });
    this.queue = [];
    this.processing = false;
  }

  /**
   * Cancel a specific request by ID
   */
  cancelRequest(id: string) {
    const index = this.queue.findIndex(req => req.id === id);
    if (index !== -1) {
      const request = this.queue.splice(index, 1)[0];
      request.reject(new Error('Request cancelled'));
    }
  }
}

// Singleton instance
export const aiRateLimiter = new AIRateLimiter();

