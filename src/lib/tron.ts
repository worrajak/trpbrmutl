// TRON Wallet Integration
// ใช้ TronLink browser extension

declare global {
  interface Window {
    tronWeb?: {
      ready: boolean;
      defaultAddress: { base58: string; hex: string };
      trx: {
        getBalance: (address: string) => Promise<number>;
        sign: (message: string) => Promise<string>;
      };
      contract: () => {
        at: (address: string) => Promise<unknown>;
      };
      toSun: (amount: number) => number;
      fromSun: (amount: number) => number;
      isAddress: (address: string) => boolean;
    };
    tronLink?: {
      request: (args: { method: string }) => Promise<{ code: number; message: string }>;
    };
  }
}

export interface TronWalletState {
  connected: boolean;
  address: string | null;
  balance: number;
  network: string;
}

export async function connectTronLink(): Promise<TronWalletState> {
  if (!window.tronLink) {
    throw new Error("กรุณาติดตั้ง TronLink Extension");
  }

  // Request connection
  const res = await window.tronLink.request({ method: "tron_requestAccounts" });
  if (res.code !== 200) {
    throw new Error("ผู้ใช้ปฏิเสธการเชื่อมต่อ");
  }

  // Wait for TronWeb to be ready
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (!window.tronWeb || !window.tronWeb.ready) {
    throw new Error("TronWeb ไม่พร้อม กรุณาเชื่อมต่อ TronLink");
  }

  const address = window.tronWeb.defaultAddress.base58;
  const balance = await window.tronWeb.trx.getBalance(address);

  return {
    connected: true,
    address,
    balance: balance / 1e6, // TRX
    network: "nile",
  };
}

export function isTronLinkInstalled(): boolean {
  return typeof window !== "undefined" && !!window.tronLink;
}

export function getTronAddress(): string | null {
  if (typeof window === "undefined") return null;
  if (!window.tronWeb || !window.tronWeb.ready) return null;
  return window.tronWeb.defaultAddress.base58 || null;
}
