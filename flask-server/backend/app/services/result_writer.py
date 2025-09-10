def write_results_txt(path, results, measure_type):
    with open(path, "w", encoding="utf-8") as f:
        for r in results:
            f.write(f"ID {r['id']}:\n")
            if measure_type == "rgbi":
                status_labels = ["OK" if s else "NOK" for s in r["each_status"]]
                f.write(f"  R: {r['avg_r']:.2f} -> {status_labels[0]}\n")
                f.write(f"  G: {r['avg_g']:.2f} -> {status_labels[1]}\n")
                f.write(f"  B: {r['avg_b']:.2f} -> {status_labels[2]}\n")
                f.write(f"  I: {r['intensity']:.2f} -> {status_labels[3]}\n")
            elif measure_type == "histogram":
                scores = r.get("scores", {})
                f.write(f"  R_diff: {scores.get('R', 0):.4f}\n")
                f.write(f"  G_diff: {scores.get('G', 0):.4f}\n")
                f.write(f"  B_diff: {scores.get('B', 0):.4f}\n")
            f.write(f"  RESULT: {r['status']}\n\n")
