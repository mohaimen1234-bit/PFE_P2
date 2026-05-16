from typing import Any, Dict, List


# ============================================================
# Security guard for CMMS AI assistant
# ============================================================
# Purpose:
# - Block requests for passwords, tokens, secrets, raw dumps, unsafe SQL/code.
# - Redact sensitive fields if they ever appear in SQL/RAG results.
# - Keep the assistant focused on maintenance/CMMS operational questions.
# ============================================================


RESTRICTED_PATTERNS = [
    # English: passwords / secrets / auth
    "password",
    "passwords",
    "password hash",
    "hashed password",
    "reset token",
    "jwt",
    "api key",
    "secret key",
    "access token",
    "refresh token",
    "database password",
    "db password",
    "connection string",
    "credentials",

    # English: data dumping / exfiltration
    "show all users",
    "list all users with",
    "extract passwords",
    "exfiltrate",
    "bypass login",

    # English: dangerous code / SQL generation
    "generate sql",
    "write sql",
    "give me sql",
    "sql injection",
    "php script",
    "shell script",
    "python script to dump",
    "script to extract",
    "delete from",
    "drop table",
    "truncate table",
    "update users",
    "insert into users",

    # English: authorization internals
    "role_permissions",
    "user_roles",
    "permissions table",
    "admin accounts",

    # French: passwords / secrets / auth
    "mot de passe",
    "mots de passe",
    "hash du mot de passe",
    "hachage",
    "jeton",
    "token",
    "clé api",
    "cle api",
    "clé secrète",
    "cle secrete",
    "chaîne de connexion",
    "chaine de connexion",
    "identifiants",

    # French: dumping / exfiltration
    "vider la base",
    "dump la base",
    "exporter tous les utilisateurs",
    "afficher tous les utilisateurs",
    "liste des utilisateurs",
    "extraire les mots de passe",
    "contourner la connexion",

    # French: SQL/code generation
    "génère une requête sql",
    "genere une requete sql",
    "écris une requête sql",
    "ecris une requete sql",
    "donne moi le sql",
    "injection sql",
    "script php",
    "script shell",
    "script python pour extraire",
    "script pour extraire",
    "supprimer de",
    "effacer la table",
    "modifier les utilisateurs",

    # French: admin/security
    "permissions admin",
    "comptes admin",
]


SENSITIVE_FIELD_KEYWORDS = [
    "password",
    "passwd",
    "hash",
    "token",
    "secret",
    "api_key",
    "apikey",
    "jwt",
    "credential",
    "credentials",
    "salt",
    "reset",
    "verification",
    "auth",
]


def detect_language(question: str) -> str:
    q = question.lower()

    french_markers = [
        "quel", "quelle", "quels", "quelles", "combien", "pourquoi",
        "réclamation", "reclamation", "équipement", "equipement",
        "ordre de travail", "ordres de travail", "pièce", "piece",
        "stock minimum", "en retard", "mot de passe",
    ]

    if any(marker in q for marker in french_markers):
        return "fr"

    return "en"


def is_restricted_question(question: str) -> bool:
    q = question.lower()
    return any(pattern in q for pattern in RESTRICTED_PATTERNS)


def restricted_response(question: str = "") -> str:
    language = detect_language(question)

    if language == "fr":
        return (
            "Je ne peux pas aider à exposer des mots de passe, jetons, données "
            "d’authentification, permissions internes, exports complets de base de données, "
            "ou du code destiné à extraire, modifier ou contourner des données sensibles. "
            "Je peux aider avec des questions de maintenance comme les équipements, "
            "réclamations, ordres de travail, tâches, pièces de rechange et résumés opérationnels."
        )

    return (
        "I cannot help expose passwords, tokens, authentication data, permission internals, "
        "raw database dumps, or code intended to extract, modify, or bypass sensitive data. "
        "I can help with maintenance-related questions such as equipment status, claims, "
        "work orders, tasks, spare parts, and operational summaries."
    )


def is_sensitive_key(key: str) -> bool:
    key_lower = key.lower()
    return any(word in key_lower for word in SENSITIVE_FIELD_KEYWORDS)


def redact_value(value: Any) -> Any:
    if isinstance(value, dict):
        return redact_dict(value)

    if isinstance(value, list):
        return [redact_value(item) for item in value]

    return value


def redact_dict(row: Dict[str, Any]) -> Dict[str, Any]:
    clean = {}

    for key, value in row.items():
        if is_sensitive_key(key):
            clean[key] = "[REDACTED]"
        else:
            clean[key] = redact_value(value)

    return clean


def redact_rows(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [redact_dict(row) for row in rows]


def sql_result_has_error(rows: List[Dict[str, Any]]) -> bool:
    return any("error" in row for row in rows)