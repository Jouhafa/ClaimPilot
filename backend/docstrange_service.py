#!/usr/bin/env python3
"""
DocStrange service for extracting transactions from PDF statements.
Called from Next.js API routes via subprocess or HTTP.
"""

import sys
import json
import os
from typing import Dict, Any, Optional

try:
    from docstrange import DocumentExtractor
except ImportError:
    print(json.dumps({
        "error": "DocStrange not installed. Run: pip install docstrange",
        "success": False
    }), file=sys.stderr)
    sys.exit(1)


def extract_with_docstrange(
    pdf_path: str,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Extract CSV from PDF using DocStrange cloud mode.

    Args:
        pdf_path: Path to PDF file
        api_key: API key for DocStrange
        (defaults to a830e6de-e258-11f0-bf19-a23842209c4a)

    Returns:
        Dict with csv_data and success status
    """
    try:
        # Use default API key if not provided
        default_api_key = "a830e6de-e258-11f0-bf19-a23842209c4a"
        api_key_to_use = api_key if api_key else default_api_key

        # Initialize extractor (cloud mode by default)
        extractor = DocumentExtractor(api_key=api_key_to_use)

        # Extract document
        result = extractor.extract(pdf_path)

        # Get CSV only
        csv_data = result.extract_csv()

        return {
            "success": True,
            "csv_data": csv_data,
            "error": None
        }
    except Exception as e:
        return {
            "success": False,
            "csv_data": None,
            "error": str(e)
        }


def main():
    """CLI entry point for subprocess calls."""
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Usage: docstrange_service.py <pdf_path> [api_key]",
            "success": False
        }), file=sys.stderr)
        sys.exit(1)

    pdf_path = sys.argv[1]
    api_key = sys.argv[2] if len(sys.argv) > 2 else None

    # Check if file exists
    if not os.path.exists(pdf_path):
        print(json.dumps({
            "error": f"File not found: {pdf_path}",
            "success": False
        }), file=sys.stderr)
        sys.exit(1)

    # Extract
    result = extract_with_docstrange(pdf_path, api_key)

    # Output JSON result
    print(json.dumps(result))

    sys.exit(0 if result["success"] else 1)


if __name__ == "__main__":
    main()
