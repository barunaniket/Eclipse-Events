// components/volunteer/QRScanner.tsx
"use client";

import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (errorMessage: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onError }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isComponentMounted = useRef(true);
  const lastScanTime = useRef(0);

  // We use refs for the callbacks so we don't constantly restart 
  // the camera hardware if the parent component re-renders.
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onScanRef.current = onScan;
    onErrorRef.current = onError;
  }, [onScan, onError]);

  useEffect(() => {
    isComponentMounted.current = true;
    
    const initializeScanner = async () => {
      try {
        // 1. Instantiate the core scanner (bypasses the ugly default UI)
        scannerRef.current = new Html5Qrcode("qr-reader");

        // 2. Start the scanner
        await scannerRef.current.start(
          { facingMode: "environment" }, // Force rear/back camera
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // Debounce: Prevent scanning the same QR multiple times a second
            const now = Date.now();
            if (isComponentMounted.current && (now - lastScanTime.current > 2000)) {
              lastScanTime.current = now;
              onScanRef.current(decodedText);
            }
          },
          (errorMessage) => {
            // html5-qrcode spams errors every frame a QR isn't detected.
            // We ignore these to keep the console clean.
          }
        );
      } catch (err: any) {
        console.error("Camera start error:", err);
        if (isComponentMounted.current && onErrorRef.current) {
          onErrorRef.current(err?.message || "Failed to start camera. Check permissions or HTTPS.");
        }
      }
    };

    // Slight delay fixes the React 18 Strict Mode double-mount camera lock issue
    const timeoutId = setTimeout(() => {
      initializeScanner();
    }, 150);

    return () => {
      isComponentMounted.current = false;
      clearTimeout(timeoutId);
      
      // Safely shut down the hardware on unmount
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop()
            .then(() => scannerRef.current?.clear())
            .catch(console.error);
        } else {
          scannerRef.current.clear();
        }
      }
    };
  }, []);

  return (
    <div className="w-full max-w-sm mx-auto overflow-hidden rounded-2xl bg-[#050505] border-2 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] relative">
      {/* Container needs a minimum height so it doesn't collapse before the camera loads */}
      <div id="qr-reader" className="w-full min-h-[250px] flex items-center justify-center"></div>
      
      {/* Custom CSS to hide any residual ugly elements from the library */}
      <style dangerouslySetInnerHTML={{__html: `
        #qr-reader { border: none !important; }
        #qr-reader video { border-radius: 1rem !important; object-fit: cover !important; }
      `}} />
    </div>
  );
};