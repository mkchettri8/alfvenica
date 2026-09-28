"""Continue an exported Wind analysis in Python without reimplementing physics.

Requires an existing local analysis.json and plotting-data.csv export. Pandas and
Matplotlib are optional notebook-side tools, not Alfvenica web dependencies.
"""
import argparse
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bundle", type=Path, help="Exported analysis.json")
    parser.add_argument("--plot", action="store_true", help="Write a simple scale-ordering PNG from exported plotting data")
    args = parser.parse_args()
    bundle = args.bundle.resolve()
    subprocess.run(["node", str(ROOT / "tools/replay-analysis.js"), str(bundle)], check=True)
    record = json.loads(bundle.read_text())
    if record.get("schema") != {"name": "org.alfvenica.wind-analysis-bundle", "version": "1.0.0"}:
        raise ValueError("Unsupported analysis bundle")
    import pandas as pd  # Optional continuation dependency, not a web runtime dependency.
    table = pd.read_csv(bundle.with_name("plotting-data.csv"))
    print(table[["timestampUtc", "proton_inertial_length", "proton_gyroradius_perp_sigma"]].head())
    if args.plot:
        import matplotlib.pyplot as plt
        columns = ["proton_inertial_length", "proton_gyroradius_perp_sigma"]
        medians = table[columns].median(skipna=True)
        fig, ax = plt.subplots(figsize=(8, 3.5))
        ax.bar(["Proton inertial length", "Perpendicular proton gyroradius"], medians)
        ax.set_ylabel("Median length (m)")
        ax.set_title("Wind numerical proton-scale ordering")
        ax.text(0.5, -0.28, "Scale order alone does not identify a physical mode.",
                transform=ax.transAxes, ha="center")
        fig.tight_layout()
        output = bundle.with_name("scale-ordering-from-export.png")
        fig.savefig(output, dpi=150)
        print(output)


if __name__ == "__main__":
    main()
