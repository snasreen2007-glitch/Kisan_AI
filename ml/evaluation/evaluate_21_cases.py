"""
KisanAI - 21 Random Testcases Evaluation Script
Randomly samples 21 real field photos across classes from ml/datasets/data/paddy_doctor_raw/
Evaluates them against http://127.0.0.1:8000/api/predict and the in-browser model.
Saves results to test_results_21_cases.json and test_results_21_cases.md
"""

import os
import glob
import json
import base64
import random
import time
import urllib.request

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
DATA_DIR = os.path.join(REPO_ROOT, "ml/datasets/data/paddy_doctor_raw")

# Ground truth folder to expected slug mapping
CLASS_MAP = {
    "brown_spot": "brown-spot",
    "blast": "rice-blast",
    "bacterial_leaf_blight": "bacterial-leaf-blight",
    "bacterial_leaf_streak": "bacterial-leaf-streak",
    "downy_mildew": "downy-mildew",
    "hispa": "hispa",
    "normal": "rice-healthy",
    "stem_borer": "yellow-stem-borer",
    "tungro": "tungro",
}

# Fix random seed for reproducibility
random.seed(42)

# Select 21 test cases with balanced representation across classes
all_samples = []
classes_list = list(CLASS_MAP.keys())

# We want 21 test cases: 2 samples for each of the 9 classes (18 total), plus 3 extra for major classes (brown_spot, blast, normal) -> 21 total
counts = {c: 2 for c in classes_list}
counts["brown_spot"] += 1
counts["blast"] += 1
counts["normal"] += 1

selected_cases = []
case_id = 1

for folder_name, n_select in counts.items():
    folder_path = os.path.join(DATA_DIR, folder_name)
    files = glob.glob(os.path.join(folder_path, "*.jpg")) + glob.glob(os.path.join(folder_path, "*.jpeg")) + glob.glob(os.path.join(folder_path, "*.png"))
    if not files:
        continue
    chosen = random.sample(files, min(n_select, len(files)))
    for img_path in chosen:
        rel_path = os.path.relpath(img_path, REPO_ROOT).replace("\\", "/")
        selected_cases.append({
            "case_id": case_id,
            "filename": os.path.basename(img_path),
            "file_path": rel_path,
            "folder": folder_name,
            "ground_truth_slug": CLASS_MAP[folder_name],
            "crop": "rice"
        })
        case_id += 1

# Shuffle the 21 test cases so they are in random order
random.shuffle(selected_cases)
for idx, case in enumerate(selected_cases):
    case["case_id"] = idx + 1

print(f"Collected {len(selected_cases)} random test cases. Running inference against http://127.0.0.1:8000/api/predict...")

results = []
correct_count = 0
total_time = 0.0

for case in selected_cases:
    full_path = os.path.join(REPO_ROOT, case["file_path"])
    with open(full_path, "rb") as f:
        img_bytes = f.read()
    b64_data = base64.b64encode(img_bytes).decode("utf-8")
    
    t0 = time.time()
    payload = json.dumps({"crop": "rice", "image": b64_data}).encode("utf-8")
    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/predict",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            resp_data = json.loads(resp.read().decode("utf-8"))
            elapsed = time.time() - t0
            total_time += elapsed
            
            pred_slug = resp_data.get("topicSlug", "unknown")
            confidence = resp_data.get("confidence", 0.0)
            candidates = resp_data.get("candidates", [])
            outcome = resp_data.get("outcome", "unknown")
            
            is_match = (pred_slug == case["ground_truth_slug"])
            if is_match:
                correct_count += 1
                
            res_entry = {
                "case_id": case["case_id"],
                "filename": case["filename"],
                "relative_path": case["file_path"],
                "ground_truth": case["ground_truth_slug"],
                "predicted": pred_slug,
                "confidence": round(confidence, 4),
                "match": is_match,
                "latency_ms": round(elapsed * 1000, 1),
                "top_candidates": candidates[:3],
                "outcome": outcome
            }
            results.append(res_entry)
            status_symbol = "✓ PASS" if is_match else "✗ REVIEW"
            print(f"[{case['case_id']:02d}/21] {case['filename']:20} | Truth: {case['ground_truth_slug']:22} | Pred: {pred_slug:22} | Conf: {confidence:.2f} | {status_symbol} ({elapsed*1000:.0f}ms)")
    except Exception as e:
        print(f"[{case['case_id']:02d}/21] Error evaluating {case['filename']}: {e}")
        results.append({
            "case_id": case["case_id"],
            "filename": case["filename"],
            "relative_path": case["file_path"],
            "ground_truth": case["ground_truth_slug"],
            "predicted": "ERROR",
            "confidence": 0.0,
            "match": False,
            "latency_ms": 0.0,
            "error": str(e)
        })

accuracy = (correct_count / len(results)) * 100 if results else 0
avg_latency = (total_time / len(results)) * 1000 if results else 0

summary = {
    "total_testcases": len(results),
    "correct_predictions": correct_count,
    "accuracy_percent": round(accuracy, 2),
    "avg_latency_ms": round(avg_latency, 1),
    "dataset": "Paddy Doctor Real Field Photos",
    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "cases": results
}

# Save JSON results
json_path = os.path.join(REPO_ROOT, "test_results_21_cases.json")
with open(json_path, "w", encoding="utf-8") as f:
    json.dump(summary, f, indent=2)

# Generate Markdown report
md_lines = [
    "# KisanAI - 21 Random Testcases Validation Report",
    "",
    f"**Date & Time**: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}  ",
    f"**Dataset**: Real Field Photos from `ml/datasets/data/paddy_doctor_raw/`  ",
    f"**Evaluated Endpoint**: `POST http://127.0.0.1:8000/api/predict`  ",
    f"**Overall Accuracy**: **{correct_count} / {len(results)} ({round(accuracy, 1)}%)**  ",
    f"**Average Latency**: **{round(avg_latency, 1)} ms** per photo  ",
    "",
    "---",
    "",
    "## Summary Table of All 21 Testcases",
    "",
    "| Case # | Photo File | Ground Truth Disease/Pest | Model Prediction | Confidence | Status | Top Candidates | Latency |",
    "|:---:|:---|:---|:---|:---:|:---:|:---|:---:|"
]

for r in results:
    match_badge = "🟢 **PASS**" if r.get("match") else "🟠 **REVIEW**"
    cands_str = ", ".join([f"{c['slug']} ({int(c['confidence']*100)}%)" for c in r.get("top_candidates", [])[:2]])
    md_lines.append(
        f"| {r['case_id']} | `{r['filename']}` | **{r['ground_truth']}** | **{r['predicted']}** | {int(r['confidence']*100)}% | {match_badge} | {cands_str} | {r['latency_ms']} ms |"
    )

md_lines.extend([
    "",
    "---",
    "",
    "## Detailed Case-by-Case Breakdown",
    ""
])

for r in results:
    md_lines.append(f"### Case #{r['case_id']}: `{r['filename']}`")
    md_lines.append(f"- **Relative Path**: `{r['relative_path']}`")
    md_lines.append(f"- **Ground Truth**: `{r['ground_truth']}`")
    md_lines.append(f"- **Predicted**: `{r['predicted']}` (Confidence: {round(r['confidence']*100, 1)}%)")
    md_lines.append(f"- **Status**: {'Passed match' if r.get('match') else 'Discrepancy (see candidates)'}")
    md_lines.append(f"- **Inference Latency**: {r['latency_ms']} ms")
    if r.get("top_candidates"):
        md_lines.append("- **Top 3 Probabilities**:")
        for cand in r["top_candidates"]:
            md_lines.append(f"  - `{cand['slug']}`: {round(cand['confidence']*100, 1)}%")
    md_lines.append("")

md_path = os.path.join(REPO_ROOT, "test_results_21_cases.md")
with open(md_path, "w", encoding="utf-8") as f:
    f.write("\n".join(md_lines))

print(f"\n========================================================")
print(f"Results saved to:")
print(f"  1. {json_path}")
print(f"  2. {md_path}")
print(f"Summary: {correct_count}/{len(results)} correct ({accuracy:.1f}%) | Avg Latency: {avg_latency:.1f}ms")
print(f"========================================================\n")

