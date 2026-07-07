// src/lib/razorpay.ts

/**
 * Dynamically loads the Razorpay checkout script into the DOM.
 * This ensures the script is only loaded when needed on the checkout page.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    // If already loaded, resolve immediately.
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      console.error("Failed to load the Razorpay SDK");
      resolve(false);
    };
    document.body.appendChild(script);
  });
}
