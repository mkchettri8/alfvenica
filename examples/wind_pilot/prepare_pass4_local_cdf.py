"""Prepare the accepted local Wind H1 CDF for the Pass 3 intake contract.

Requires caller-provided CDF, pandas, and cdflib. No download or network access.
The accepted Pass 1 manifest supplies the expected file identity and window.
"""
import copy
import hashlib
import json
import sys
from pathlib import Path

import cdflib
import numpy as np
import pandas as pd

from prepare_with_pandas import write_prepared_wind_interval


ROOT = Path(__file__).resolve().parents[2]
MANIFEST = json.loads((ROOT / "examples/wind_pilot/manifest.json").read_text())
TEMPLATE = json.loads((ROOT / "examples/wind_pilot/metadata.json").read_text())


def prepare(cdf_path, csv_path, sidecar_path):
    cdf_path = Path(cdf_path)
    source = next(item for item in MANIFEST["source_files"]
                  if item["role"] == "primary_required_plasma_and_co_reported_field")
    data = cdf_path.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    if cdf_path.name != source["filename"] or len(data) != source["byte_size"] or digest != source["sha256"]:
        raise ValueError("Local CDF name, size, or SHA-256 differs from accepted Pass 1 manifest")
    cdf = cdflib.CDF(str(cdf_path))
    global_attrs = cdf.globalattsget()
    if (global_attrs.get("Logical_source") != ["wind_vs_swe"] or
            global_attrs.get("Data_version") != [source["cdf_data_version"]] or
            global_attrs.get("Time_resolution") != ["92 seconds"]):
        raise ValueError("CDF global source/version/time metadata disagree with accepted Pass 1")
    if "10: Solar wind parameters OK" not in cdf.varattsget("fit_flag")["VAR_NOTES"]:
        raise ValueError("CDF fit_flag meaning differs from accepted policy")
    if int(cdf.varattsget("fit_flag")["FILLVAL"]) != -128 or \
            float(cdf.varattsget("Epoch")["FILLVAL"]) != -1e31:
        raise ValueError("CDF time or fit-flag fill differs from accepted Pass 1")
    if "trace" not in cdf.varattsget("Proton_W_nonlin")["CATDESC"] or \
            "perpendicular" not in cdf.varattsget("Proton_Wperp_nonlin")["CATDESC"]:
        raise ValueError("CDF thermal-speed meanings differ from accepted Pass 1")
    for axis in "XYZ":
        if "GSE" not in cdf.varattsget(f"B{axis}")["CATDESC"] or \
                "averaged over plasma measurement" not in cdf.varattsget(f"B{axis}")["CATDESC"]:
            raise ValueError("CDF magnetic-field source/frame differs from accepted Pass 1")

    metadata = copy.deepcopy(TEMPLATE)
    metadata["source"] = {
        "mission": "Wind", "productId": source["product_id"], "datasetDoi": source["dataset_doi"],
        "fileName": source["filename"], "productVersion": global_attrs["Data_version"][0],
        "dataOrigin": "CDF_DERIVED", "sha256": digest, "digestScope": "SOURCE_FILE_BYTES_ONLY",
        "archiveUrl": source["archive_url"],
    }
    archive_units = {"cm^-3": "cm^{-3}", "km/s": "km/s", "nT": "nT"}
    for column in metadata["columns"]:
        if column["kind"] != "number":
            continue
        attrs = cdf.varattsget(column["sourceVariable"])
        if attrs.get("UNITS") != archive_units[column["archiveUnit"]] or \
                float(attrs.get("FILLVAL")) != float(np.float32(-1e31)):
            raise ValueError(f"CDF unit/fill differs for {column['sourceVariable']}")
        column["validRange"] = {"min": float(attrs["VALIDMIN"]), "max": float(attrs["VALIDMAX"]),
                                "unit": column["archiveUnit"], "source": "CDF_VALIDMIN_VALIDMAX"}

    times = pd.to_datetime(cdflib.cdfepoch.to_datetime(cdf.varget("Epoch")), utc=True)
    start = pd.Timestamp(metadata["time"]["interval"]["start"])
    end = pd.Timestamp(metadata["time"]["interval"]["end"])
    selected = [index for index, timestamp in enumerate(times) if start <= timestamp < end]
    if len(selected) != MANIFEST["primary"]["swe_selected"]:
        raise ValueError("Selected spectrum count differs from accepted Pass 1 inventory")
    columns = {"source_record_index": selected, "Epoch": [times[index] for index in selected]}
    for column in metadata["columns"]:
        name = column["sourceVariable"]
        if name is None or name == "Epoch":
            continue
        values = cdf.varget(name)
        if any(values[index] == cdf.varattsget(name)["FILLVAL"] for index in selected):
            raise ValueError(f"Selected {name} contains a CDF fill; explicit preparation is required")
        columns[column["column"]] = [int(values[index]) if name == "fit_flag" else float(values[index])
                                     for index in selected]
    frame = pd.DataFrame(columns)
    write_prepared_wind_interval(frame, metadata, csv_path, sidecar_path)
    return {"sourceSha256": digest, "sourceBytes": len(data), "selectedRows": len(selected),
            "firstSourceRow": selected[0], "lastSourceRow": selected[-1]}


if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit("Usage: python prepare_pass4_local_cdf.py <accepted.cdf> <prepared.csv> <metadata.json>")
    print(json.dumps(prepare(*sys.argv[1:]), indent=2))
