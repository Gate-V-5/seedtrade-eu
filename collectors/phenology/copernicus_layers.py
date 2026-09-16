"""
SeedTrade.eu
Copernicus CLMS Layer Registry v0.3

Central registry of Copernicus Land Monitoring Service
crop intelligence layers used by SeedTrade.eu.

IMPORTANT
---------
Only layers whose identifiers and semantics have been
verified against official Copernicus Data Space documentation
should be enabled here.
"""


COPERNICUS_LAYERS = {

    "CTY": {
        "name": "Crop Types",
        "collection_id": "4fa71893-371f-4440-97c4-917f569f67b2",
        "band": "CTY",
        "type": "categorical",
        "unit": None,
        "enabled": True,
    },

    "CPMCE": {
        "name": "Main Crop Emergence",
        "collection_id": "10c22197-036f-44d0-b09c-5864d811f154",
        "band": "CPMCE",
        "type": "date_yydoy",
        "unit": "YYDOY",
        "enabled": True,
    },

    "CPMCECL": {
        "name": "Main Crop Emergence Confidence Layer",
        "collection_id": "67b6bd60-b5e5-4792-959a-b7b5d2f6157a",
        "band": "CPMCECL",
        "type": "uncertainty",
        "unit": "days",
        "range": [1, 40],
        "enabled": True,
    },

    "CPMCD": {
        "name": "Main Crop Duration",
        "collection_id": "0c1cf3ba-b04b-48c1-982f-e5861c0fdbd1",
        "band": "CPMCD",
        "type": "duration",
        "unit": "days",
        "range": [0, 365],
        "enabled": True,
    },

    "CPMCDCL": {
        "name": "Main Crop Duration Confidence Layer",
        "collection_id": "1d4d9305-042a-4894-8a57-dfe93937a81a",
        "band": "CPMCDCL",
        "type": "confidence",
        "unit": "confidence",
        "range": [0, 100],
        "enabled": True,
    },

    "CPMCH": {
        "name": "Main Crop Harvest",
        "collection_id": "78f39ff7-e8f3-4579-a2e4-c6a99cc6e49f",
        "band": "CPMCH",
        "type": "date_yydoy",
        "unit": "YYDOY",
        "enabled": True,
    },

    "CPMCHCL": {
        "name": "Main Crop Harvest Confidence Layer",
        "collection_id": "a4e9b287-6d76-4d22-83c6-a3371a17de02",
        "band": "CPMCHCL",
        "type": "uncertainty",
        "unit": "days",
        "range": [1, 40],
        "enabled": True,
    },

}


def get_layer(layer_code):

    if layer_code not in COPERNICUS_LAYERS:
        raise KeyError(
            f"Unknown Copernicus layer: {layer_code}"
        )

    return COPERNICUS_LAYERS[layer_code]


def get_collection_id(layer_code):

    return get_layer(
        layer_code
    )["collection_id"]


def get_data_type(layer_code):

    collection_id = get_collection_id(
        layer_code
    )

    return (
        f"byoc-{collection_id}"
    )


def get_band(layer_code):

    return get_layer(
        layer_code
    )["band"]


def get_enabled_layers():

    return {
        code: layer
        for code, layer
        in COPERNICUS_LAYERS.items()
        if layer.get(
            "enabled",
            False,
        )
    }


def validate_registry():

    errors = []

    for code, layer in COPERNICUS_LAYERS.items():

        required = (
            "name",
            "collection_id",
            "band",
            "type",
            "enabled",
        )

        for field in required:

            if field not in layer:
                errors.append(
                    f"{code}: missing {field}"
                )

        collection_id = layer.get(
            "collection_id"
        )

        if not collection_id:
            errors.append(
                f"{code}: empty collection_id"
            )

        band = layer.get(
            "band"
        )

        if band != code:
            errors.append(
                f"{code}: band mismatch ({band})"
            )

    return errors


def print_registry():

    print()

    print(
        "========================================================"
    )

    print(
        "SeedTrade.eu Copernicus Layer Registry v0.3"
    )

    print(
        "========================================================"
    )

    print()

    for code, layer in COPERNICUS_LAYERS.items():

        status = (
            "ENABLED"
            if layer["enabled"]
            else "DISABLED"
        )

        print(
            f"{code:<8} | "
            f"{layer['name']:<40} | "
            f"{status}"
        )

        print(
            f"         Collection: "
            f"{layer['collection_id']}"
        )

        print(
            f"         Band: "
            f"{layer['band']}"
        )

        print(
            f"         Type: "
            f"{layer['type']}"
        )

        print(
            f"         Unit: "
            f"{layer.get('unit')}"
        )

        if "range" in layer:

            print(
                f"         Range: "
                f"{layer['range'][0]}"
                f"–"
                f"{layer['range'][1]}"
            )

        print()

    errors = validate_registry()

    print(
        "--------------------------------------------------------"
    )

    if errors:

        print(
            "REGISTRY VALIDATION: FAILED"
        )

        for error in errors:

            print(
                f"  {error}"
            )

    else:

        print(
            "REGISTRY VALIDATION: OK"
        )

    print(
        "========================================================"
    )


if __name__ == "__main__":

    print_registry()