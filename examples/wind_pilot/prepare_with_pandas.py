"""Write an already-prepared Wind DataFrame to the Pass 3 CSV + JSON contract.

Caller supplies the DataFrame and verified CDF-derived sidecar metadata. This
example does not obtain data or infer archive attributes. Validate the output
with: node tools/import-interval.js prepared.csv metadata.json
"""

import json
from pathlib import Path

import pandas as pd  # Optional example dependency; not an Alfvenica runtime dependency.


def write_prepared_wind_interval(frame, metadata, csv_path, sidecar_path):
    if not isinstance(metadata, dict):
        raise ValueError("Caller must supply a sidecar metadata object")
    source = metadata.get("source")
    if not isinstance(source, dict):
        raise ValueError("Caller must supply real CDF source identity and version")
    if source.get("dataOrigin") != "CDF_DERIVED" or any(
        not source.get(key) for key in ("mission", "productId", "datasetDoi", "fileName", "productVersion")
    ):
        raise ValueError("Caller must supply real CDF source identity and version")
    columns = metadata.get("columns")
    if not isinstance(columns, list) or not columns:
        raise ValueError("Caller must supply the complete column metadata")
    names = [column.get("column") for column in columns]
    if len(set(names)) != len(names) or len(frame.columns) != len(names) or set(names) != set(frame.columns):
        raise ValueError("DataFrame columns must exactly match the supplied sidecar")
    if not any(column.get("semanticId") == "prepared.source_row_index" for column in columns):
        raise ValueError("Preserved source_record_index metadata is required")
    if any(column.get("kind") == "number" and not column.get("validRange") for column in columns):
        raise ValueError("Caller must supply source CDF VALIDMIN/VALIDMAX for numeric columns")
    epoch_column = metadata.get("time", {}).get("column")
    if epoch_column not in names:
        raise ValueError("Declared Epoch column is required")

    def utc_milliseconds(value):
        if pd.isna(value):
            raise ValueError("Missing Epoch cannot be exported")
        timestamp = pd.Timestamp(value)
        if timestamp.tzinfo is None:
            raise ValueError("Epoch must already have an explicit timezone")
        if timestamp.utcoffset().total_seconds() != 0:
            raise ValueError("Epoch must already be UTC before export")
        timestamp = timestamp.tz_convert("UTC")
        if timestamp.microsecond % 1000 or timestamp.nanosecond:
            raise ValueError("Epoch has sub-millisecond precision; do not truncate it")
        return timestamp.strftime("%Y-%m-%dT%H:%M:%S.") + f"{timestamp.microsecond // 1000:03d}Z"

    prepared = frame.loc[:, names].copy()  # Includes source ID and each declared vector component.
    prepared[epoch_column] = prepared[epoch_column].map(utc_milliseconds)
    sidecar_text = json.dumps(metadata, indent=2, allow_nan=False) + "\n"
    prepared.to_csv(csv_path, index=False, na_rep="null", lineterminator="\n")
    Path(sidecar_path).write_text(sidecar_text, encoding="utf-8")
