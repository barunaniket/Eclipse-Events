"use client";

import QRCode from "react-qr-code";

type DynamicQrCodeProps = {
  value: string;
  size?: number;
  className?: string;
};

export default function DynamicQrCode({ value, size, className }: DynamicQrCodeProps) {
  return <QRCode value={value} size={size} className={className} />;
}
