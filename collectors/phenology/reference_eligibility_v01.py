"""Metadata screening only: never establishes ground truth or classifier accuracy."""


def screen(record, year):
    """Return all missing/failed checks; do not modify the supplied record."""
    missing, failed = [], []
    for field in ("reference_id", "source_url", "license_evidence", "group_id",
                  "geometry_evidence", "crs", "position_quality_evidence",
                  "label_definition_evidence", "training_provenance_evidence"):
        value = record.get(field)
        if value is None or value == "":
            missing.append(field)
        elif not isinstance(value, str) or not value.strip():
            failed.append(field + ":INVALID_TEXT")
        elif field in ("reference_id", "group_id") and value != value.strip():
            # Reject ambiguous input rather than silently changing identifiers.
            failed.append(field + ":PADDED_ID")
    for field, allowed in (
        ("unit", {"PARCEL"}),
        ("season", {"WINTER", "SPRING"}),
        ("training_use", {"EXCLUDED"}),
        ("geometry_review", {"VERIFIED"}),
        ("label_review", {"VERIFIED"}),
        ("usage_review", {"PERMITTED"}),
    ):
        value = record.get(field)
        if value is None or value == "" or value == "UNKNOWN":
            missing.append(field)
        elif not isinstance(value, str) or value not in allowed:
            failed.append(field + ":UNSUITABLE")
    value = record.get("reference_year")
    if value is None:
        missing.append("reference_year")
    elif type(value) is not int or value != year:
        failed.append("reference_year:MISMATCH_OR_INVALID")
    return {"reference_id": record.get("reference_id"),
            "status": "REJECTED" if failed else "PENDING_EVIDENCE" if missing else "CANDIDATE_FOR_REVIEW",
            "missing": missing, "failed": failed,
            "independent_accuracy_established": False}


def screen_manifest(records, year):
    """Check record identity and grouped split leakage in addition to metadata."""
    if type(year) is not int or not 1900 <= year <= 2100:
        raise ValueError("Expected integer reference year")
    if not isinstance(records, list) or any(not isinstance(r, dict) for r in records):
        raise ValueError("Expected a list of reference objects")
    result = [screen(r, year) for r in records]
    ids, groups = {}, {}
    for i, record in enumerate(records):
        rid, group, split = (record.get(k) for k in ("reference_id", "group_id", "split"))
        if isinstance(rid, str) and rid.strip():
            ids.setdefault(rid, []).append(i)
        if split not in ("DEVELOPMENT", "HELD_OUT", None):
            result[i]["failed"].append("split:INVALID")
        if isinstance(group, str) and group.strip() and split in ("DEVELOPMENT", "HELD_OUT"):
            groups.setdefault(group, []).append((i, split))
        if split == "HELD_OUT":
            if record.get("prior_inspection") is True:
                result[i]["failed"].append("split:PREVIOUSLY_INSPECTED")
            elif record.get("prior_inspection") is not False:
                result[i]["missing"].append("prior_inspection")
    for indices in ids.values():
        if len(indices) > 1:
            for i in indices:
                result[i]["failed"].append("reference_id:DUPLICATE")
    for members in groups.values():
        if len({split for _, split in members}) > 1:
            for i, _ in members:
                result[i]["failed"].append("split:GROUP_LEAKAGE")
    for row in result:
        row["status"] = "REJECTED" if row["failed"] else "PENDING_EVIDENCE" if row["missing"] else "CANDIDATE_FOR_REVIEW"
    return {"reference_year": year, "records": result,
            "independent_accuracy_established": False,
            "scope": "Metadata screening; evidence claims require human/source verification. Geometry and labels are not validated by this function."}
