"use client";

import { useState, useEffect } from "react";

interface Props {
  tokenCode: string;
  currentWallet: string | null;
  onWalletLinked: (address: string) => void;
}

export default function TronWalletConnect({ tokenCode, currentWallet, onWalletLinked }: Props) {
  const [hasTronLink, setHasTronLink] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(currentWallet);
  const [trxBalance, setTrxBalance] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check TronLink availability
    const checkTronLink = () => {
      if (typeof window !== "undefined" && window.tronLink) {
        setHasTronLink(true);
        // If already connected
        if (window.tronWeb && window.tronWeb.ready) {
          const addr = window.tronWeb.defaultAddress.base58;
          if (addr) setWalletAddress(addr);
        }
      }
    };
    checkTronLink();
    // TronLink may load after page
    const timer = setTimeout(checkTronLink, 1000);
    return () => clearTimeout(timer);
  }, []);

  async function handleConnect() {
    setConnecting(true);
    setError("");

    try {
      if (!window.tronLink) {
        throw new Error("กรุณาติดตั้ง TronLink Extension");
      }

      const res = await window.tronLink.request({ method: "tron_requestAccounts" });
      if (res.code !== 200) {
        throw new Error("กรุณาอนุมัติการเชื่อมต่อใน TronLink");
      }

      await new Promise((r) => setTimeout(r, 500));

      if (!window.tronWeb || !window.tronWeb.ready) {
        throw new Error("TronWeb ไม่พร้อม");
      }

      const address = window.tronWeb.defaultAddress.base58;
      const balance = await window.tronWeb.trx.getBalance(address);
      setWalletAddress(address);
      setTrxBalance(balance / 1e6);

      // ผูก wallet กับ token ใน Supabase
      const linkRes = await fetch("/api/supabase/token/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token_code: tokenCode, tron_wallet: address }),
      });

      if (!linkRes.ok) {
        const data = await linkRes.json();
        throw new Error(data.error || "ผูก wallet ไม่สำเร็จ");
      }

      onWalletLinked(address);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setConnecting(false);
    }
  }

  // Already linked
  if (walletAddress) {
    return (
      <div className="flex items-center gap-2 rounded bg-green-50 px-3 py-2 text-xs">
        <span className="text-green-600">&#9679;</span>
        <span className="font-mono text-green-700">
          {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
        </span>
        {trxBalance !== null && (
          <span className="text-gray-500">({trxBalance.toFixed(1)} TRX)</span>
        )}
      </div>
    );
  }

  // Not linked yet
  return (
    <div className="flex items-center gap-2">
      {hasTronLink ? (
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {connecting ? "กำลังเชื่อม..." : "เชื่อม TronLink Wallet"}
        </button>
      ) : (
        <a
          href="https://www.tronlink.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded bg-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-300"
        >
          ติดตั้ง TronLink
        </a>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
