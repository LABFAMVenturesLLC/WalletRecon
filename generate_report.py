#!/usr/bin/env python3
"""
WalletRecon — Forensic Report Generator
=========================================
Reads JSON results from walletrecon.py and generates a professional
Word document (.docx) forensic report.

Usage:
    python3 generate_report.py [results.json] [--output report.docx]

Requirements:
    - Node.js with docx package: npm install -g docx
    - make_report.js must be in the same directory as this script
"""

import sys
import os
import subprocess
import argparse
from pathlib import Path


def generate_report(json_path: str, output_path: str):
    script_dir = Path(__file__).parent
    js_file = script_dir / "make_report.js"

    if not js_file.exists():
        print(f"ERROR: make_report.js not found at {js_file}")
        print("Ensure make_report.js is in the same directory as generate_report.py")
        sys.exit(1)

    print(f"Generating Word report: {output_path} ...")
    result = subprocess.run(
        ["node", str(js_file), json_path, output_path],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"ERROR: {result.stderr}")
        sys.exit(1)

    print(result.stdout.strip())
    size_kb = Path(output_path).stat().st_size // 1024
    print(f"Report size: {size_kb} KB")


def main():
    parser = argparse.ArgumentParser(
        description="WalletRecon — Generate a Word forensic report from scan JSON output"
    )
    parser.add_argument("json_file", nargs="?", default="walletrecon_results.json",
                        help="JSON results file from walletrecon.py")
    parser.add_argument("--output", default="walletrecon_report.docx",
                        help="Output Word document path")
    args = parser.parse_args()

    if not Path(args.json_file).exists():
        print(f"ERROR: JSON file not found: {args.json_file}")
        sys.exit(1)

    generate_report(args.json_file, args.output)


if __name__ == "__main__":
    main()
