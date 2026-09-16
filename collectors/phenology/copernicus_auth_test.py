"""
SeedTrade.eu
Copernicus OAuth Authentication Test v0.1

Purpose
-------
Read Copernicus OAuth credentials from local .env file,
request an access token from Copernicus Data Space Ecosystem,
and confirm that authentication works.

Security
--------
- Client Secret is never printed.
- Access token is not printed in full.
- Credentials stay in local .env.
"""

import json
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


# ============================================================
# PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

ENV_FILE = PROJECT_ROOT / ".env"


# ============================================================
# COPERNICUS OAUTH
# ============================================================

TOKEN_URL = (
    "https://identity.dataspace.copernicus.eu/"
    "auth/realms/CDSE/protocol/openid-connect/token"
)


# ============================================================
# ENV READER
# ============================================================

def load_env_file(file_path):

    if not file_path.exists():

        raise FileNotFoundError(
            f".env file not found: {file_path}"
        )

    values = {}

    with open(
        file_path,
        "r",
        encoding="utf-8",
    ) as file:

        for raw_line in file:

            line = raw_line.strip()

            if not line:
                continue

            if line.startswith("#"):
                continue

            if "=" not in line:
                continue

            key, value = line.split(
                "=",
                1,
            )

            key = key.strip()
            value = value.strip()

            values[key] = value

    return values


# ============================================================
# VALIDATION
# ============================================================

def validate_credentials(env_values):

    client_id = env_values.get(
        "COPERNICUS_CLIENT_ID"
    )

    client_secret = env_values.get(
        "COPERNICUS_CLIENT_SECRET"
    )

    if not client_id:

        raise ValueError(
            "COPERNICUS_CLIENT_ID not found in .env"
        )

    if not client_secret:

        raise ValueError(
            "COPERNICUS_CLIENT_SECRET not found in .env"
        )

    return (
        client_id,
        client_secret,
    )


# ============================================================
# TOKEN REQUEST
# ============================================================

def request_access_token(
    client_id,
    client_secret,
):

    payload = urlencode({
        "grant_type":
            "client_credentials",

        "client_id":
            client_id,

        "client_secret":
            client_secret,
    }).encode(
        "utf-8"
    )


    request = Request(
        TOKEN_URL,
        data=payload,
        method="POST",
        headers={
            "Content-Type":
                "application/x-www-form-urlencoded",

            "Accept":
                "application/json",

            "User-Agent":
                "SeedTrade.eu-Copernicus/0.1",
        },
    )


    with urlopen(
        request,
        timeout=60,
    ) as response:

        data = json.load(
            response
        )


    return data


# ============================================================
# SAFE TOKEN SUMMARY
# ============================================================

def summarize_token(
    token_data,
):

    access_token = token_data.get(
        "access_token"
    )

    token_type = token_data.get(
        "token_type"
    )

    expires_in = token_data.get(
        "expires_in"
    )

    scope = token_data.get(
        "scope"
    )


    if not access_token:

        raise ValueError(
            "Copernicus response did not contain access_token"
        )


    token_length = len(
        access_token
    )


    return {
        "token_received":
            True,

        "token_type":
            token_type,

        "expires_in_seconds":
            expires_in,

        "scope":
            scope,

        "token_length":
            token_length,
    }


# ============================================================
# PRINT
# ============================================================

def print_result(
    client_id,
    summary,
):

    print()

    print(
        "========================================================"
    )

    print(
        "SeedTrade.eu Copernicus OAuth Test v0.1"
    )

    print(
        "========================================================"
    )

    print()


    print(
        ".env file: FOUND"
    )


    print(
        "COPERNICUS_CLIENT_ID: FOUND"
    )


    print(
        "COPERNICUS_CLIENT_SECRET: FOUND"
    )


    print()


    print(
        "Client ID:"
    )

    if len(client_id) > 12:

        safe_client_id = (
            client_id[:6]
            + "..."
            + client_id[-6:]
        )

    else:

        safe_client_id = "***"


    print(
        f"  {safe_client_id}"
    )


    print()


    print(
        "OAuth authentication: SUCCESS"
    )


    print(
        f"Token type: "
        f"{summary.get('token_type')}"
    )


    print(
        f"Expires in: "
        f"{summary.get('expires_in_seconds')} seconds"
    )


    print(
        f"Token length: "
        f"{summary.get('token_length')} characters"
    )


    print()

    print(
        "IMPORTANT:"
    )

    print(
        "  Access token was NOT printed."
    )

    print(
        "  Client Secret was NOT printed."
    )

    print(
        "  Credentials remain only in local .env."
    )

    print()

    print(
        "========================================================"
    )


# ============================================================
# MAIN
# ============================================================

def main():

    try:

        env_values = (
            load_env_file(
                ENV_FILE
            )
        )


        client_id, client_secret = (
            validate_credentials(
                env_values
            )
        )


        token_data = (
            request_access_token(
                client_id,
                client_secret,
            )
        )


        summary = (
            summarize_token(
                token_data
            )
        )


        print_result(
            client_id,
            summary,
        )


    except HTTPError as exc:

        print()

        print(
            "========================================================"
        )

        print(
            "Copernicus OAuth Test FAILED"
        )

        print(
            "========================================================"
        )

        print()

        print(
            f"HTTP status: {exc.code}"
        )

        print(
            f"Error: {exc.reason}"
        )

        print()

        print(
            "Most likely causes:"
        )

        print(
            "  - incorrect Client ID"
        )

        print(
            "  - incorrect Client Secret"
        )

        print(
            "  - OAuth client inactive or expired"
        )

        print()

        print(
            "========================================================"
        )


    except URLError as exc:

        print()

        print(
            "Copernicus connection error:"
        )

        print(
            exc
        )


    except Exception as exc:

        print()

        print(
            "Copernicus OAuth Test FAILED"
        )

        print()

        print(
            f"Error: {exc}"
        )


if __name__ == "__main__":

    main()