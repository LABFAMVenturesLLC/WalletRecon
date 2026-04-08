#!/usr/bin/env python3
"""
WalletRecon — Cryptocurrency & Virtual Wallet Forensic Scanner
==============================================================
Scans a drive/directory for cryptocurrency wallets, keys, transaction
records, and related artifacts. Outputs structured JSON for report generation.

Usage:
    python walletrecon.py <path_to_scan> [--output results.json]

Dependencies:
    pip install python-magic --break-system-packages  (optional, for MIME detection)
"""

import os
import re
import json
import sys
import hashlib
import argparse
import platform
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any

# ─────────────────────────────────────────────
#  Regex patterns for crypto artifacts
# ─────────────────────────────────────────────

PATTERNS = {
    # ── Wallet Addresses ──────────────────────────────────────────────────
    "Bitcoin (BTC) Address (Legacy P2PKH)": re.compile(r'\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b'),
    "Bitcoin (BTC) Address (Bech32/SegWit)": re.compile(r'\bbc1[a-z0-9]{39,59}\b'),
    "Ethereum (ETH) / ERC-20 Address":       re.compile(r'\b0x[a-fA-F0-9]{40}\b'),
    "Litecoin (LTC) Address":                re.compile(r'\b[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}\b'),
    "Monero (XMR) Address":                  re.compile(r'\b4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}\b'),
    "Ripple (XRP) Address":                  re.compile(r'\br[a-zA-Z0-9]{24,34}\b'),
    "Dogecoin (DOGE) Address":               re.compile(r'\bD[5-9A-HJ-NP-U][1-9A-HJ-NP-Za-km-z]{32}\b'),
    "Dash Address":                          re.compile(r'\bX[1-9A-HJ-NP-Za-km-z]{33}\b'),
    "Zcash (ZEC) Transparent Address":       re.compile(r'\bt1[a-zA-Z0-9]{33}\b'),
    "Bitcoin Cash (BCH) Address":            re.compile(r'\bq[a-z0-9]{41}\b'),

    # ── Private Keys & Seeds ──────────────────────────────────────────────
    "Bitcoin WIF Private Key":               re.compile(r'\b[5KL][1-9A-HJ-NP-Za-km-z]{50,51}\b'),
    "Ethereum Private Key (hex)":            re.compile(r'\b(?:0x)?[a-fA-F0-9]{64}\b'),
    "BIP39 Mnemonic Seed (12-word)":         re.compile(r'\b(?:[a-z]{3,8}\s){11}[a-z]{3,8}\b'),
    "BIP39 Mnemonic Seed (24-word)":         re.compile(r'\b(?:[a-z]{3,8}\s){23}[a-z]{3,8}\b'),
    "Extended Public Key (xpub)":            re.compile(r'\bxpub[a-zA-Z0-9]{107}\b'),
    "Extended Private Key (xprv)":           re.compile(r'\bxprv[a-zA-Z0-9]{107}\b'),

    # ── Exchange / Service References ─────────────────────────────────────
    "Crypto Exchange Reference": re.compile(
        r'\b(Binance|Coinbase|Kraken|Bitfinex|Bitstamp|Gemini|FTX|Huobi|OKX|'
        r'KuCoin|Bybit|Crypto\.com|LocalBitcoins|Paxful|Uniswap|OpenSea)\b',
        re.IGNORECASE
    ),

    # ── Transaction Hashes ────────────────────────────────────────────────
    "Transaction Hash (TXID)":              re.compile(r'\b[a-fA-F0-9]{64}\b'),

    # ── Smart Contracts & DeFi ────────────────────────────────────────────
    "Smart Contract ABI Reference":         re.compile(r'"type"\s*:\s*"(function|event|constructor)"'),
    "Web3/Ethers.js Import":                re.compile(r'\b(?:require|import)\s*[(\'"](web3|ethers|@ethersproject)[\'")]', re.IGNORECASE),
}

# ─────────────────────────────────────────────
#  Wallet file signatures & known paths
# ─────────────────────────────────────────────

WALLET_FILENAMES = {
    "wallet.dat":        "Bitcoin Core / BerkeleyDB wallet",
    "wallet.json":       "Generic JSON wallet file",
    "keystore":          "Ethereum keystore directory",
    "UTC--":             "Ethereum UTC keystore file",
    ".wallet":           "Generic wallet file",
    "electrum":          "Electrum wallet",
    "exodus":            "Exodus desktop wallet",
    "metamask":          "MetaMask browser extension data",
    "ledger":            "Ledger hardware wallet config",
    "trezor":            "Trezor hardware wallet config",
    "myetherwallet":     "MyEtherWallet export",
    "mew_keystore":      "MyEtherWallet keystore",
    "bitcore":           "Bitcore wallet",
    "armory":            "Armory Bitcoin wallet",
    "multibit":          "MultiBit wallet",
    "coinomi":           "Coinomi mobile wallet backup",
    "atomic":            "Atomic wallet data",
    "trustwallet":       "Trust Wallet data",
    "jaxx":              "Jaxx wallet data",
    "copay":             "Copay wallet data",
    "breadwallet":       "BRD/Bread wallet",
}

WALLET_EXTENSIONS = {
    ".dat":    "BerkeleyDB wallet (Bitcoin Core)",
    ".wallet": "Generic wallet file",
    ".keystore": "Keystore file",
    ".key":    "Cryptographic key file",
    ".pem":    "PEM encoded key/certificate",
    ".seed":   "Seed file",
    ".aes":    "AES-encrypted file (possible wallet backup)",
}

# Known wallet/crypto application paths by OS
KNOWN_PATHS = {
    "windows": [
        r"%APPDATA%\Bitcoin",
        r"%APPDATA%\Ethereum",
        r"%APPDATA%\Electrum",
        r"%APPDATA%\Exodus",
        r"%APPDATA%\Litecoin",
        r"%APPDATA%\Dogecoin",
        r"%APPDATA%\Monero Project\Monero GUI Wallet",
        r"%APPDATA%\Zcash",
        r"%APPDATA%\Dash Core",
        r"%LOCALAPPDATA%\Google\Chrome\User Data\Default\Local Extension Settings",
        r"%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Local Extension Settings",
    ],
    "linux": [
        "~/.bitcoin",
        "~/.ethereum",
        "~/.electrum",
        "~/.config/Exodus",
        "~/.local/share/Exodus",
        "~/.monero",
        "~/.zcash",
        "~/.dogecoin",
        "~/.litecoin",
        "~/.config/google-chrome/Default/Local Extension Settings",
    ],
    "darwin": [
        "~/Library/Application Support/Bitcoin",
        "~/Library/Application Support/Ethereum",
        "~/Library/Application Support/Exodus",
        "~/Library/Application Support/Electrum",
        "~/Library/Application Support/Monero GUI Wallet",
        "~/Library/Application Support/Zcash",
        "~/Library/Application Support/Dogecoin",
    ],
}

# File extensions to skip (binary/media unlikely to contain text artifacts)
SKIP_EXTENSIONS = {
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.mp3', '.mp4', '.avi', '.mkv',
    '.mov', '.flv', '.wmv', '.iso', '.dmg', '.exe', '.dll', '.so', '.dylib',
    '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar', '.bin', '.img', '.sys',
    '.mui', '.msi', '.cab', '.lnk', '.ico', '.cur', '.ani', '.ttf', '.otf',
    '.woff', '.woff2', '.pyc', '.pyd', '.class', '.o', '.obj',
}

# Max file size to scan for text patterns (10 MB)
MAX_SCAN_SIZE = 10 * 1024 * 1024


# ─────────────────────────────────────────────
#  Scanner class
# ─────────────────────────────────────────────

class CryptoScanner:
    def __init__(self, scan_path: str, verbose: bool = False):
        self.scan_path = Path(scan_path).resolve()
        self.verbose = verbose
        self.results: dict[str, Any] = {
            "meta": {
                "scan_path": str(self.scan_path),
                "scan_timestamp": datetime.now().isoformat(),
                "hostname": platform.node(),
                "os": platform.system(),
                "scanner_name": "WalletRecon",
            "scanner_version": "1.0.0",
            },
            "summary": {
                "total_files_scanned": 0,
                "total_errors": 0,
                "wallet_files_found": 0,
                "pattern_hits": 0,
                "known_path_hits": 0,
            },
            "wallet_files": [],
            "pattern_matches": [],
            "known_path_findings": [],
            "errors": [],
        }

    # ── Helpers ──────────────────────────────────────────────────────────

    def _log(self, msg: str):
        if self.verbose:
            print(f"[*] {msg}", flush=True)

    def _file_hash(self, path: Path) -> str:
        """Compute MD5 hash of a file (for forensic reference)."""
        try:
            h = hashlib.md5()
            with open(path, "rb") as f:
                for chunk in iter(lambda: f.read(65536), b""):
                    h.update(chunk)
            return h.hexdigest()
        except Exception:
            return "error"

    def _file_stat(self, path: Path) -> dict:
        try:
            st = path.stat()
            return {
                "size_bytes": st.st_size,
                "modified": datetime.fromtimestamp(st.st_mtime).isoformat(),
                "created": datetime.fromtimestamp(st.st_ctime).isoformat(),
            }
        except Exception:
            return {}

    # ── Wallet file detection ─────────────────────────────────────────────

    def _check_wallet_filename(self, path: Path) -> str | None:
        name_lower = path.name.lower()
        for sig, desc in WALLET_FILENAMES.items():
            if sig.lower() in name_lower:
                return desc
        if path.suffix.lower() in WALLET_EXTENSIONS:
            return WALLET_EXTENSIONS[path.suffix.lower()]
        return None

    def _scan_wallet_files(self):
        self._log(f"Scanning for wallet files in {self.scan_path}")
        for dirpath, dirnames, filenames in os.walk(self.scan_path, onerror=self._onerror):
            # Skip hidden system dirs to keep scan reasonable
            dirnames[:] = [d for d in dirnames if not d.startswith('.git')]
            for fname in filenames:
                fpath = Path(dirpath) / fname
                desc = self._check_wallet_filename(fpath)
                if desc:
                    self._log(f"Wallet file: {fpath}")
                    entry = {
                        "path": str(fpath),
                        "filename": fname,
                        "wallet_type": desc,
                        "md5": self._file_hash(fpath),
                        **self._file_stat(fpath),
                    }
                    self.results["wallet_files"].append(entry)
                    self.results["summary"]["wallet_files_found"] += 1

    # ── Pattern scanning ──────────────────────────────────────────────────

    def _scan_file_for_patterns(self, path: Path):
        if path.suffix.lower() in SKIP_EXTENSIONS:
            return
        try:
            size = path.stat().st_size
            if size == 0 or size > MAX_SCAN_SIZE:
                return
        except Exception:
            return

        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
        except Exception:
            return

        for pattern_name, pattern in PATTERNS.items():
            matches = pattern.findall(content)
            if matches:
                unique = list(set(matches))[:20]  # cap at 20 unique per file/pattern
                entry = {
                    "path": str(path),
                    "pattern": pattern_name,
                    "match_count": len(matches),
                    "unique_samples": unique[:5],
                    **self._file_stat(path),
                }
                self.results["pattern_matches"].append(entry)
                self.results["summary"]["pattern_hits"] += len(matches)
                self._log(f"  Pattern '{pattern_name}' ({len(matches)} hits) in {path}")

    def _scan_patterns(self):
        self._log("Scanning file contents for crypto patterns...")
        count = 0
        for dirpath, dirnames, filenames in os.walk(self.scan_path, onerror=self._onerror):
            dirnames[:] = [d for d in dirnames if not d.startswith('.git')]
            for fname in filenames:
                fpath = Path(dirpath) / fname
                self._scan_file_for_patterns(fpath)
                count += 1
        self.results["summary"]["total_files_scanned"] = count

    # ── Known path detection ──────────────────────────────────────────────

    def _check_known_paths(self):
        os_key = platform.system().lower()
        if os_key not in KNOWN_PATHS:
            os_key = "linux"
        for raw_path in KNOWN_PATHS[os_key]:
            expanded = Path(os.path.expandvars(os.path.expanduser(raw_path)))
            if expanded.exists():
                entry = {
                    "expected_path": raw_path,
                    "resolved_path": str(expanded),
                    "exists": True,
                    "is_dir": expanded.is_dir(),
                    **self._file_stat(expanded),
                }
                self.results["known_path_findings"].append(entry)
                self.results["summary"]["known_path_hits"] += 1
                self._log(f"Known crypto path found: {expanded}")

    # ── Error handler ─────────────────────────────────────────────────────

    def _onerror(self, err):
        self.results["errors"].append(str(err))
        self.results["summary"]["total_errors"] += 1

    # ── Main entry ────────────────────────────────────────────────────────

    def run(self) -> dict:
        print(f"\n{'='*60}")
        print(f"  WalletRecon — Cryptocurrency Forensic Scanner")
        print(f"  Target: {self.scan_path}")
        print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}\n")

        self._check_known_paths()
        self._scan_wallet_files()
        self._scan_patterns()

        print(f"\n{'='*60}")
        print(f"  Scan Complete")
        print(f"  Files scanned:      {self.results['summary']['total_files_scanned']}")
        print(f"  Wallet files found: {self.results['summary']['wallet_files_found']}")
        print(f"  Pattern hits:       {self.results['summary']['pattern_hits']}")
        print(f"  Known paths hit:    {self.results['summary']['known_path_hits']}")
        print(f"  Errors:             {self.results['summary']['total_errors']}")
        print(f"{'='*60}\n")

        return self.results


# ─────────────────────────────────────────────
#  CLI entry point
# ─────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="WalletRecon — Cryptocurrency & Virtual Wallet Forensic Scanner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python walletrecon.py /mnt/evidence            # scan a mounted drive
  python walletrecon.py C:\\Users --verbose       # verbose Windows scan
  python walletrecon.py . --output my_scan.json  # save JSON results
  python walletrecon.py /home --report           # scan + generate Word report
        """
    )
    parser.add_argument("path", help="Path to scan (directory or drive mount point)")
    parser.add_argument("--output", default="walletrecon_results.json",
                        help="Output JSON file (default: walletrecon_results.json)")
    parser.add_argument("--report", action="store_true",
                        help="Also generate a Word document report after scanning")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Print progress during scan")
    args = parser.parse_args()

    if not Path(args.path).exists():
        print(f"ERROR: Path does not exist: {args.path}")
        sys.exit(1)

    scanner = CryptoScanner(args.path, verbose=args.verbose)
    results = scanner.run()

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"Results saved to: {args.output}")

    if args.report:
        try:
            subprocess.run(
                ["python3", "generate_report.py", args.output],
                check=True
            )
        except Exception as e:
            print(f"Report generation failed: {e}")
            print("Run: python3 generate_report.py walletrecon_results.json")


if __name__ == "__main__":
    main()
