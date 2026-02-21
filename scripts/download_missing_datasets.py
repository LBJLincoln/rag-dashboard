#!/usr/bin/env python3
"""
Download missing HuggingFace datasets as JSONL files.
Handles datasets library v4.5.0 which no longer supports loading scripts.
Uses streaming=True to avoid memory issues.
"""

import json
import os
import sys
import time
import traceback

OUTPUT_DIR = "/home/user/mon-ipad/datasets/hf"
LIMIT = 1000


def map_finqa(row, idx):
    """Map FinQA dataset fields."""
    question = row.get("question", row.get("query", ""))
    answer = row.get("answer", row.get("exe_ans", row.get("gold_answer", "")))
    row_id = row.get("id", row.get("idx", str(idx)))
    return {
        "id": f"finqa-{row_id}",
        "dataset": "finqa",
        "question": question,
        "answer": str(answer),
        "type": "quantitative",
        "source": "finqa"
    }


def map_tatqa(row, idx):
    """Map TAT-QA dataset fields."""
    question = row.get("question", row.get("query", ""))
    answer = row.get("answer", row.get("gold_answer", ""))
    if isinstance(answer, list):
        answer = ", ".join(str(a) for a in answer)
    row_id = row.get("id", row.get("idx", row.get("uid", str(idx))))
    return {
        "id": f"tatqa-{row_id}",
        "dataset": "tatqa",
        "question": question,
        "answer": str(answer),
        "type": "quantitative",
        "source": "tatqa"
    }


def map_convfinqa(row, idx):
    """Map ConvFinQA dataset fields."""
    question = row.get("question", row.get("query", ""))
    answer = row.get("answer", row.get("exe_ans", row.get("gold_answer", "")))
    row_id = row.get("id", row.get("idx", str(idx)))
    return {
        "id": f"convfinqa-{row_id}",
        "dataset": "convfinqa",
        "question": question,
        "answer": str(answer),
        "type": "quantitative",
        "source": "convfinqa"
    }


def map_wikitablequestions(row, idx):
    """Map WikiTableQuestions / web_questions dataset fields."""
    question = row.get("question", row.get("utterance", row.get("query", "")))
    answer = row.get("answer", row.get("answers", row.get("target_values", "")))
    if isinstance(answer, list):
        answer = ", ".join(str(a) for a in answer)
    row_id = row.get("id", row.get("idx", str(idx)))
    return {
        "id": f"wikitablequestions-{row_id}",
        "dataset": "wikitablequestions",
        "question": question,
        "answer": str(answer),
        "type": "quantitative",
        "source": "wikitablequestions"
    }


def map_musique(row, idx):
    """Map MuSiQue dataset fields."""
    question = row.get("question", row.get("query", ""))
    answer = row.get("answer", row.get("gold_answer", row.get("answer_text", "")))
    if isinstance(answer, list):
        answer = answer[0] if answer else ""
    row_id = row.get("id", row.get("idx", str(idx)))
    return {
        "id": f"musique-{row_id}",
        "dataset": "musique",
        "question": question,
        "answer": str(answer),
        "type": "multi-hop",
        "source": "musique"
    }


def map_2wikimultihopqa(row, idx):
    """Map 2WikiMultihopQA dataset fields."""
    question = row.get("question", row.get("query", ""))
    answer = row.get("answer", row.get("gold_answer", ""))
    if isinstance(answer, list):
        answer = answer[0] if answer else ""
    row_id = row.get("_id", row.get("id", row.get("idx", str(idx))))
    return {
        "id": f"2wikimultihopqa-{row_id}",
        "dataset": "2wikimultihopqa",
        "question": question,
        "answer": str(answer),
        "type": "multi-hop",
        "source": "2wikimultihopqa"
    }


DATASETS = [
    {
        "name": "finqa",
        "hf_ids": ["ibm/finqa", "ChanceFocus/flare-finqa", "dreamerdeo/finqa"],
        "mapper": map_finqa,
    },
    {
        "name": "tatqa",
        "hf_ids": ["ChanceFocus/flare-tatqa", "next-tat-qa"],
        "mapper": map_tatqa,
    },
    {
        "name": "convfinqa",
        "hf_ids": ["ChanceFocus/flare-convfinqa", "czyssrs/ConvFinQA"],
        "mapper": map_convfinqa,
    },
    {
        "name": "wikitablequestions",
        "hf_ids": ["Stanford/web_questions", "TableSenseAI/WikiTableQuestions"],
        "mapper": map_wikitablequestions,
    },
    {
        "name": "musique",
        "hf_ids": ["StanfordNLP/musique"],
        "mapper": map_musique,
    },
    {
        "name": "2wikimultihopqa",
        "hf_ids": ["xanhho/2WikiMultihopQA", "drt/2wikimultihopqa"],
        "mapper": map_2wikimultihopqa,
    },
]


def try_load_dataset(hf_id):
    """Try to load a dataset with multiple strategies."""
    from datasets import load_dataset

    errors = []

    # Strategy 1: streaming with common splits
    for split in ["test", "validation", "train"]:
        try:
            print(f"    Trying: load_dataset('{hf_id}', split='{split}', streaming=True)")
            ds = load_dataset(hf_id, split=split, streaming=True, trust_remote_code=True)
            item = next(iter(ds))
            print(f"    SUCCESS with split='{split}'. Sample keys: {list(item.keys())}")
            return ds, split, item
        except StopIteration:
            errors.append(f"split={split}: empty dataset")
        except Exception as e:
            err_msg = str(e)[:200]
            errors.append(f"split={split}: {err_msg}")
            print(f"    FAILED split='{split}': {err_msg[:120]}")

    # Strategy 2: streaming without specifying split
    try:
        print(f"    Trying: load_dataset('{hf_id}', streaming=True) without split")
        ds_dict = load_dataset(hf_id, streaming=True, trust_remote_code=True)
        available_splits = list(ds_dict.keys()) if hasattr(ds_dict, 'keys') else []
        print(f"    Available splits: {available_splits}")
        for s in available_splits:
            try:
                item = next(iter(ds_dict[s]))
                print(f"    SUCCESS with auto-split='{s}'. Sample keys: {list(item.keys())}")
                return ds_dict[s], s, item
            except StopIteration:
                continue
    except Exception as e:
        errors.append(f"no-split: {str(e)[:200]}")
        print(f"    FAILED no-split: {str(e)[:120]}")

    # Strategy 3: Try specific configs
    for config in ["main", "default", "en"]:
        try:
            print(f"    Trying: load_dataset('{hf_id}', '{config}', streaming=True)")
            ds = load_dataset(hf_id, config, split="train", streaming=True, trust_remote_code=True)
            item = next(iter(ds))
            print(f"    SUCCESS with config='{config}'. Sample keys: {list(item.keys())}")
            return ds, f"{config}/train", item
        except Exception as e:
            errors.append(f"config={config}: {str(e)[:100]}")

    print(f"    ALL strategies failed for {hf_id}")
    for err in errors:
        print(f"      - {err[:150]}")
    return None, None, None


def download_dataset(ds_config):
    """Download a single dataset, trying multiple HF IDs."""
    name = ds_config["name"]
    output_path = os.path.join(OUTPUT_DIR, f"{name}.jsonl")

    # Check if already exists with content
    if os.path.exists(output_path):
        size = os.path.getsize(output_path)
        if size > 100:
            print(f"\n[SKIP] {name}.jsonl already exists ({size:,} bytes)")
            return True

    print(f"\n{'='*60}")
    print(f"DOWNLOADING: {name}")
    print(f"{'='*60}")

    mapper = ds_config["mapper"]

    for hf_id in ds_config["hf_ids"]:
        print(f"\n  Trying HF ID: {hf_id}")

        try:
            ds, split_name, sample_item = try_load_dataset(hf_id)

            if ds is None:
                print(f"  Could not load {hf_id}, trying next...")
                continue

            # Show sample mapping
            print(f"\n  Sample raw item keys: {list(sample_item.keys())}")
            sample_mapped = mapper(sample_item, 0)
            q_preview = sample_mapped['question'][:80] if sample_mapped['question'] else "(empty)"
            a_preview = str(sample_mapped['answer'])[:60] if sample_mapped['answer'] else "(empty)"
            print(f"  Sample mapped: question='{q_preview}' answer='{a_preview}'")

            # Check if question and answer are non-empty
            if not sample_mapped['question'].strip():
                print(f"  WARNING: Empty question field. Raw item sample:")
                for k, v in list(sample_item.items())[:10]:
                    print(f"    {k}: {str(v)[:120]}")
                print(f"  Trying next HF ID...")
                continue

            # Download and save
            count = 0
            skipped = 0
            start_time = time.time()

            with open(output_path, 'w', encoding='utf-8') as f:
                for i, row in enumerate(ds):
                    if count >= LIMIT:
                        break

                    try:
                        mapped = mapper(dict(row), i)

                        # Skip items with empty question or answer
                        if not mapped['question'].strip() or not mapped['answer'].strip():
                            skipped += 1
                            continue

                        f.write(json.dumps(mapped, ensure_ascii=False) + '\n')
                        count += 1

                        if count % 100 == 0:
                            elapsed = time.time() - start_time
                            print(f"  Progress: {count}/{LIMIT} items ({elapsed:.1f}s)")

                    except Exception as e:
                        skipped += 1
                        if skipped <= 3:
                            print(f"  Skip item {i}: {str(e)[:100]}")

            elapsed = time.time() - start_time
            file_size = os.path.getsize(output_path)
            print(f"\n  DONE: {name}.jsonl -- {count} items, {file_size:,} bytes, {elapsed:.1f}s (skipped {skipped})")

            if count == 0:
                print(f"  WARNING: 0 items saved, removing empty file")
                os.remove(output_path)
                continue

            return True

        except Exception as e:
            print(f"  ERROR with {hf_id}: {str(e)[:200]}")
            traceback.print_exc()
            continue

    print(f"\n  FAILED: Could not download {name} from any source")
    return False


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("=" * 60)
    print("HuggingFace Dataset Downloader (v4.5.0 compatible)")
    print(f"Output: {OUTPUT_DIR}")
    print(f"Limit: {LIMIT} items per dataset")
    print("=" * 60)

    results = {}

    for ds_config in DATASETS:
        name = ds_config["name"]
        try:
            success = download_dataset(ds_config)
            results[name] = "OK" if success else "FAILED"
        except Exception as e:
            print(f"\n  CRITICAL ERROR for {name}: {e}")
            traceback.print_exc()
            results[name] = "CRITICAL_FAIL"

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    for name, status in results.items():
        icon = "[OK]  " if status == "OK" else "[FAIL]"
        output_path = os.path.join(OUTPUT_DIR, f"{name}.jsonl")
        size = os.path.getsize(output_path) if os.path.exists(output_path) else 0
        print(f"  {icon} {name:25s} -- {size:>10,} bytes")

    # List all files in output dir
    print(f"\nAll files in {OUTPUT_DIR}:")
    for f in sorted(os.listdir(OUTPUT_DIR)):
        fp = os.path.join(OUTPUT_DIR, f)
        if os.path.isfile(fp):
            print(f"  {f:40s} {os.path.getsize(fp):>12,} bytes")

    failed = [n for n, s in results.items() if s != "OK"]
    if failed:
        print(f"\nFAILED datasets: {', '.join(failed)}")
        return 1

    print("\nAll datasets downloaded successfully!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
