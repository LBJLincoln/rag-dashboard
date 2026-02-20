#!/usr/bin/env python3
"""
Process Sectors — Main processing script for sector-based document ingestion
Reads datasets, classifies by sector/type, applies chunking strategies
Author: Claude Opus 4.6
Created: 2026-02-20
"""

import argparse
import json
import logging
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
import hashlib

# Import sector file types module
try:
    from sector_file_types import (
        SECTOR_FILE_TYPES,
        detect_sector,
        get_chunking_strategy,
        get_pipeline_for_type,
        get_types_by_sector,
        get_types_by_pipeline
    )
except ImportError:
    sys.path.insert(0, str(Path(__file__).parent))
    from sector_file_types import (
        SECTOR_FILE_TYPES,
        detect_sector,
        get_chunking_strategy,
        get_pipeline_for_type,
        get_types_by_sector,
        get_types_by_pipeline
    )

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SectorDocumentProcessor:
    """Process documents by sector with appropriate chunking strategies."""

    def __init__(
        self,
        datasets_dir: str = "/home/termius/mon-ipad/datasets",
        output_dir: str = "/home/termius/mon-ipad/outputs/sector-batches",
        batch_size: int = 1000
    ):
        self.datasets_dir = Path(datasets_dir)
        self.output_dir = Path(output_dir)
        self.batch_size = batch_size

        # Create output directory
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Stats tracking
        self.stats = {
            "total_processed": 0,
            "by_sector": {"BTP": 0, "Finance": 0, "Juridique": 0, "Industrie": 0, "Unknown": 0},
            "by_pipeline": {"standard": 0, "graph": 0, "quantitative": 0},
            "by_type": {},
            "errors": 0,
            "batches_created": 0
        }

        # Current batch
        self.current_batch = []
        self.batch_number = 0

    def detect_document_type(self, doc: Dict[str, Any]) -> Optional[str]:
        """
        Detect specific document type from document metadata.
        Returns type_id or None.
        """
        # Get document info
        filename = doc.get("filename", "")
        title = doc.get("title", "")
        content_preview = doc.get("content", "")[:1000] if doc.get("content") else ""

        # First detect sector
        sector = detect_sector(filename, content_preview)
        if not sector:
            return None

        # Get all types for this sector
        sector_types = get_types_by_sector(sector)

        # Score each type based on keyword matches
        best_match = None
        best_score = 0

        for doc_type in sector_types:
            score = 0

            # Check filename
            for keyword in doc_type["keywords_fr"]:
                if keyword.lower() in filename.lower():
                    score += 3
                if keyword.lower() in title.lower():
                    score += 2
                if keyword.lower() in content_preview.lower():
                    score += 1

            if score > best_score:
                best_score = score
                best_match = doc_type["id"]

        return best_match if best_score > 0 else None

    def chunk_document(
        self,
        content: str,
        strategy: str,
        doc_metadata: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Apply chunking strategy to document content.
        Returns list of chunks with metadata.
        """
        chunks = []

        if strategy == "finance_page_level":
            # Split by page markers or fixed size
            chunk_size = 2000  # characters per chunk
            for i in range(0, len(content), chunk_size):
                chunk_text = content[i:i+chunk_size]
                chunks.append({
                    "text": chunk_text,
                    "chunk_index": len(chunks),
                    "strategy": strategy,
                    "size": len(chunk_text)
                })

        elif strategy == "legal_clause_based":
            # Split by article/clause markers
            import re
            # Match "Article X", "Clause X", numbered lists
            clause_pattern = r'(?:Article|Clause|§)\s+\d+|^\d+\.'

            current_chunk = ""
            for line in content.split('\n'):
                if re.match(clause_pattern, line.strip()) and current_chunk:
                    # Start new chunk
                    chunks.append({
                        "text": current_chunk.strip(),
                        "chunk_index": len(chunks),
                        "strategy": strategy,
                        "size": len(current_chunk)
                    })
                    current_chunk = line + '\n'
                else:
                    current_chunk += line + '\n'

                # Max chunk size
                if len(current_chunk) > 3000:
                    chunks.append({
                        "text": current_chunk.strip(),
                        "chunk_index": len(chunks),
                        "strategy": strategy,
                        "size": len(current_chunk)
                    })
                    current_chunk = ""

            # Last chunk
            if current_chunk.strip():
                chunks.append({
                    "text": current_chunk.strip(),
                    "chunk_index": len(chunks),
                    "strategy": strategy,
                    "size": len(current_chunk)
                })

        elif strategy == "btp_spec_based":
            # Split by technical sections (LOT, POSTE, etc.)
            import re
            section_pattern = r'(?:LOT|POSTE|ARTICLE|CHAPITRE)\s+\d+'

            current_chunk = ""
            for line in content.split('\n'):
                if re.match(section_pattern, line.strip(), re.IGNORECASE) and current_chunk:
                    chunks.append({
                        "text": current_chunk.strip(),
                        "chunk_index": len(chunks),
                        "strategy": strategy,
                        "size": len(current_chunk)
                    })
                    current_chunk = line + '\n'
                else:
                    current_chunk += line + '\n'

                if len(current_chunk) > 2500:
                    chunks.append({
                        "text": current_chunk.strip(),
                        "chunk_index": len(chunks),
                        "strategy": strategy,
                        "size": len(current_chunk)
                    })
                    current_chunk = ""

            if current_chunk.strip():
                chunks.append({
                    "text": current_chunk.strip(),
                    "chunk_index": len(chunks),
                    "strategy": strategy,
                    "size": len(current_chunk)
                })

        elif strategy == "industry_hierarchical":
            # Split by hierarchical sections (1., 1.1., 1.1.1., etc.)
            import re
            hierarchy_pattern = r'^\d+(?:\.\d+)*\.'

            current_chunk = ""
            for line in content.split('\n'):
                if re.match(hierarchy_pattern, line.strip()) and current_chunk:
                    chunks.append({
                        "text": current_chunk.strip(),
                        "chunk_index": len(chunks),
                        "strategy": strategy,
                        "size": len(current_chunk)
                    })
                    current_chunk = line + '\n'
                else:
                    current_chunk += line + '\n'

                if len(current_chunk) > 2000:
                    chunks.append({
                        "text": current_chunk.strip(),
                        "chunk_index": len(chunks),
                        "strategy": strategy,
                        "size": len(current_chunk)
                    })
                    current_chunk = ""

            if current_chunk.strip():
                chunks.append({
                    "text": current_chunk.strip(),
                    "chunk_index": len(chunks),
                    "strategy": strategy,
                    "size": len(current_chunk)
                })

        else:  # default_semantic
            # Simple semantic chunking by paragraphs with max size
            paragraphs = content.split('\n\n')
            current_chunk = ""

            for para in paragraphs:
                if len(current_chunk) + len(para) > 1500 and current_chunk:
                    chunks.append({
                        "text": current_chunk.strip(),
                        "chunk_index": len(chunks),
                        "strategy": strategy,
                        "size": len(current_chunk)
                    })
                    current_chunk = para + '\n\n'
                else:
                    current_chunk += para + '\n\n'

            if current_chunk.strip():
                chunks.append({
                    "text": current_chunk.strip(),
                    "chunk_index": len(chunks),
                    "strategy": strategy,
                    "size": len(current_chunk)
                })

        # Add document metadata to each chunk
        for chunk in chunks:
            chunk.update({
                "doc_id": doc_metadata.get("id"),
                "doc_filename": doc_metadata.get("filename"),
                "doc_sector": doc_metadata.get("sector"),
                "doc_type": doc_metadata.get("type_id"),
                "doc_pipeline": doc_metadata.get("pipeline")
            })

        return chunks

    def process_document(self, doc: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Process a single document: detect sector/type, chunk, prepare for ingestion.
        Returns processed document dict or None if error.
        """
        try:
            # Extract basic info
            doc_id = doc.get("id") or hashlib.md5(
                str(doc).encode()
            ).hexdigest()[:16]

            filename = doc.get("filename", f"doc_{doc_id}")
            content = doc.get("content") or doc.get("text") or ""

            if not content:
                logger.warning(f"Document {doc_id} has no content")
                return None

            # Detect sector
            sector = detect_sector(filename, content[:1000])
            if not sector:
                logger.debug(f"Could not detect sector for {filename}")
                sector = "Unknown"

            # Detect specific document type
            type_id = self.detect_document_type(doc)

            # Get chunking strategy
            chunking_strategy = get_chunking_strategy(sector, type_id)

            # Get pipeline
            pipeline = get_pipeline_for_type(type_id) if type_id else "standard"

            # Create document metadata
            doc_metadata = {
                "id": doc_id,
                "filename": filename,
                "sector": sector,
                "type_id": type_id,
                "pipeline": pipeline,
                "chunking_strategy": chunking_strategy,
                "original_size": len(content),
                "processed_at": datetime.utcnow().isoformat()
            }

            # Chunk document
            chunks = self.chunk_document(content, chunking_strategy, doc_metadata)

            # Update stats
            self.stats["total_processed"] += 1
            self.stats["by_sector"][sector] = self.stats["by_sector"].get(sector, 0) + 1
            self.stats["by_pipeline"][pipeline] = self.stats["by_pipeline"].get(pipeline, 0) + 1

            if type_id:
                self.stats["by_type"][type_id] = self.stats["by_type"].get(type_id, 0) + 1

            return {
                "metadata": doc_metadata,
                "chunks": chunks,
                "chunk_count": len(chunks)
            }

        except Exception as e:
            logger.error(f"Error processing document: {e}", exc_info=True)
            self.stats["errors"] += 1
            return None

    def add_to_batch(self, processed_doc: Dict[str, Any]) -> None:
        """Add processed document to current batch."""
        self.current_batch.append(processed_doc)

        # Write batch if full
        if len(self.current_batch) >= self.batch_size:
            self.write_batch()

    def write_batch(self) -> None:
        """Write current batch to file."""
        if not self.current_batch:
            return

        self.batch_number += 1
        batch_filename = self.output_dir / f"batch_{self.batch_number:04d}.json"

        # Prepare batch metadata
        batch_data = {
            "batch_number": self.batch_number,
            "document_count": len(self.current_batch),
            "created_at": datetime.utcnow().isoformat(),
            "documents": self.current_batch
        }

        # Write to file
        with open(batch_filename, 'w', encoding='utf-8') as f:
            json.dump(batch_data, f, ensure_ascii=False, indent=2)

        logger.info(f"Wrote batch {self.batch_number} with {len(self.current_batch)} documents to {batch_filename}")

        self.stats["batches_created"] += 1
        self.current_batch = []

    def process_datasets(
        self,
        sector_filter: Optional[str] = None,
        pipeline_filter: Optional[str] = None,
        max_docs: Optional[int] = None,
        dry_run: bool = False
    ) -> Dict[str, Any]:
        """
        Process all datasets in the datasets directory.

        Args:
            sector_filter: Only process this sector (BTP/Finance/Juridique/Industrie/all)
            pipeline_filter: Only process docs for this pipeline
            max_docs: Maximum documents to process
            dry_run: Only count/classify, don't actually process

        Returns:
            Processing statistics
        """
        logger.info(f"Starting dataset processing (sector={sector_filter}, pipeline={pipeline_filter}, max={max_docs}, dry_run={dry_run})")

        # Find all JSON files in datasets directory
        dataset_files = list(self.datasets_dir.glob("**/*.json"))
        logger.info(f"Found {len(dataset_files)} dataset files")

        docs_processed = 0

        for dataset_file in dataset_files:
            try:
                logger.info(f"Processing dataset: {dataset_file.name}")

                with open(dataset_file, 'r', encoding='utf-8') as f:
                    dataset = json.load(f)

                # Handle different dataset formats
                documents = []
                if isinstance(dataset, list):
                    documents = dataset
                elif isinstance(dataset, dict):
                    # Try common keys
                    documents = (
                        dataset.get("data") or
                        dataset.get("documents") or
                        dataset.get("items") or
                        [dataset]  # Single document
                    )

                logger.info(f"Found {len(documents)} documents in {dataset_file.name}")

                for doc in documents:
                    # Check max limit
                    if max_docs and docs_processed >= max_docs:
                        logger.info(f"Reached max documents limit: {max_docs}")
                        break

                    # Process document
                    processed = self.process_document(doc)
                    if not processed:
                        continue

                    # Apply filters
                    if sector_filter and sector_filter != "all":
                        if processed["metadata"]["sector"] != sector_filter:
                            continue

                    if pipeline_filter and pipeline_filter != "all":
                        if processed["metadata"]["pipeline"] != pipeline_filter:
                            continue

                    # Add to batch (if not dry run)
                    if not dry_run:
                        self.add_to_batch(processed)

                    docs_processed += 1

                    # Progress logging
                    if docs_processed % 100 == 0:
                        logger.info(f"Processed {docs_processed} documents...")

            except Exception as e:
                logger.error(f"Error processing dataset file {dataset_file}: {e}", exc_info=True)
                continue

        # Write final batch
        if not dry_run and self.current_batch:
            self.write_batch()

        logger.info(f"Processing complete. Total documents: {docs_processed}")

        return self.stats

    def write_stats(self) -> None:
        """Write processing statistics to file."""
        stats_file = self.output_dir / "processing_stats.json"

        with open(stats_file, 'w', encoding='utf-8') as f:
            json.dump(self.stats, f, ensure_ascii=False, indent=2)

        logger.info(f"Wrote statistics to {stats_file}")

        # Also print to console
        print("\n=== Processing Statistics ===")
        print(f"Total processed: {self.stats['total_processed']}")
        print(f"Batches created: {self.stats['batches_created']}")
        print(f"Errors: {self.stats['errors']}")

        print("\nBy sector:")
        for sector, count in self.stats["by_sector"].items():
            print(f"  {sector}: {count}")

        print("\nBy pipeline:")
        for pipeline, count in self.stats["by_pipeline"].items():
            print(f"  {pipeline}: {count}")

        print(f"\nTop 10 document types:")
        sorted_types = sorted(
            self.stats["by_type"].items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]
        for type_id, count in sorted_types:
            print(f"  {type_id}: {count}")


def main():
    parser = argparse.ArgumentParser(
        description="Process sector datasets for n8n ingestion"
    )

    parser.add_argument(
        "--sector",
        choices=["BTP", "Finance", "Juridique", "Industrie", "all"],
        default="all",
        help="Which sector to process (default: all)"
    )

    parser.add_argument(
        "--pipeline",
        choices=["standard", "graph", "quantitative", "all"],
        default="all",
        help="Filter by target pipeline (default: all)"
    )

    parser.add_argument(
        "--max",
        type=int,
        help="Maximum documents to process"
    )

    parser.add_argument(
        "--batch-size",
        type=int,
        default=1000,
        help="Batch size for output files (default: 1000)"
    )

    parser.add_argument(
        "--datasets-dir",
        default="/home/termius/mon-ipad/datasets",
        help="Directory containing datasets (default: /home/termius/mon-ipad/datasets)"
    )

    parser.add_argument(
        "--output-dir",
        default="/home/termius/mon-ipad/outputs/sector-batches",
        help="Output directory for processed batches (default: /home/termius/mon-ipad/outputs/sector-batches)"
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only count and classify, don't process"
    )

    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging"
    )

    args = parser.parse_args()

    # Set log level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Create processor
    processor = SectorDocumentProcessor(
        datasets_dir=args.datasets_dir,
        output_dir=args.output_dir,
        batch_size=args.batch_size
    )

    # Process datasets
    stats = processor.process_datasets(
        sector_filter=args.sector,
        pipeline_filter=args.pipeline,
        max_docs=args.max,
        dry_run=args.dry_run
    )

    # Write stats
    processor.write_stats()

    # Exit code based on errors
    sys.exit(1 if stats["errors"] > 0 else 0)


if __name__ == "__main__":
    main()
