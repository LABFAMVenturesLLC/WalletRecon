# WalletRecon

Forensic scanner for cryptocurrency wallets, private keys, and virtual asset artifacts — with automated Word report generation.

WalletRecon is an open-source forensic tool designed for investigators, security researchers, and digital forensics professionals. It scans a drive, partition, or directory for evidence of cryptocurrency activity — identifying wallet files, private keys, seed phrases, wallet addresses, exchange references, and known application paths — then compiles all findings into a structured, professional Word document report.

Features

Detects wallet files by name, signature, and extension (wallet.dat, UTC--*, .keystore, .seed, and more)
Recognizes addresses for 10+ cryptocurrencies including BTC (Legacy & SegWit), ETH/ERC-20, LTC, XMR, XRP, DOGE, ZEC, and DASH
Identifies private keys (WIF & hex), BIP39 mnemonic seed phrases (12 & 24 word), and extended keys (xpub/xprv)
Detects known wallet application directories for Bitcoin Core, Exodus, Electrum, MetaMask, Monero, Zcash, and more across Windows, macOS, and Linux
Flags cryptocurrency exchange references (Binance, Coinbase, Kraken, FTX, etc.) and Web3 code patterns
Computes MD5 hashes of wallet files for forensic integrity verification
Generates a polished, multi-section Word (.docx) report with risk assessment, summary statistics, and detailed evidence tables

Use Cases

Digital forensics and incident response (DFIR)
Legal discovery and asset recovery investigations
Internal compliance audits
Security research and threat hunting

Requirements

Python 3.8+
Node.js with the docx package (npm install -g docx)

Disclaimer: WalletRecon is intended for lawful use only. Always ensure you have proper legal authority before scanning any storage device or system.
