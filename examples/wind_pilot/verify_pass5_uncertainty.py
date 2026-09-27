"""Verify fit-sigma attributes in an already-local, accepted Wind H1 CDF.

Requires cdflib. Reads no network data and changes no accepted preparation schema.
"""
import hashlib
import json
import sys
from pathlib import Path

import cdflib


ROOT = Path(__file__).resolve().parents[2]
MANIFEST = json.loads((ROOT / "examples/wind_pilot/manifest.json").read_text())
FIELDS = {
    "Proton_sigmaNp_nonlin": ("Proton_Np_nonlin", "cm^{-3}", "proton density"),
    "Proton_sigmaW_nonlin": ("Proton_W_nonlin", "km/s", "proton trace thermal speed"),
    "Proton_sigmaWperp_nonlin": ("Proton_Wperp_nonlin", "km/s", "perpendicular proton thermal speed"),
}
FIT_NOTE = "Obtained from non-linear fitting to the ion current distribution function (CDF)."


def verify(path):
    path = Path(path)
    source = next(item for item in MANIFEST["source_files"]
                  if item["role"] == "primary_required_plasma_and_co_reported_field")
    data = path.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    if path.name != source["filename"] or len(data) != source["byte_size"] or digest != source["sha256"]:
        raise ValueError("CDF file identity disagrees with accepted Pass 1 manifest")
    cdf = cdflib.CDF(str(path))
    globals_ = cdf.globalattsget()
    if globals_.get("Logical_source") != ["wind_vs_swe"] or globals_.get("Data_version") != [source["cdf_data_version"]]:
        raise ValueError("CDF source or version differs from accepted product")
    fields = {}
    for sigma, (parent, unit, description) in FIELDS.items():
        sigma_attrs, parent_attrs = cdf.varattsget(sigma), cdf.varattsget(parent)
        if (sigma_attrs.get("UNITS") != unit or parent_attrs.get("UNITS") != unit or
                sigma_attrs.get("CATDESC") != f"1-sigma uncertainty in the {description}" +
                (" [km/s]." if unit == "km/s" else "") or
                sigma_attrs.get("VAR_NOTES") != FIT_NOTE or parent_attrs.get("VAR_NOTES") != FIT_NOTE or
                parent_attrs.get("DELTA_PLUS_VAR") != sigma or parent_attrs.get("DELTA_MINUS_VAR") != sigma):
            raise ValueError(f"CDF fit-sigma interpretation differs for {sigma}")
        fields[sigma] = {
            "associatedSourceVariable": parent, "archiveUnit": unit,
            "sigmaLevel": 1, "meaning": "NONLINEAR_FIT_PRECISION_ONLY",
            "cdfCatdesc": sigma_attrs["CATDESC"], "cdfVarNotes": sigma_attrs["VAR_NOTES"],
            "association": "DELTA_PLUS_VAR_AND_DELTA_MINUS_VAR",
        }
    return {
        "schema": {"name": "org.alfvenica.wind-fit-uncertainty-source", "version": "1.0.0"},
        "verification": "CDF_ATTRIBUTES_CHECKED_LOCALLY",
        "source": {"fileName": path.name, "sha256": digest, "byteSize": len(data),
                   "productId": source["product_id"], "datasetDoi": source["dataset_doi"],
                   "productVersion": globals_["Data_version"][0]},
        "fields": fields,
        "scope": "File identity and stated fit attributes only; not calibration, covariance, or scientific correctness",
    }


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python verify_pass5_uncertainty.py <accepted-local.cdf>")
    print(json.dumps(verify(sys.argv[1]), indent=2))
