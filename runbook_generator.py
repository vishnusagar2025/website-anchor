# OFFLINE MODE — rule-based local runbook generation. No API key needed.
#
# TO SWITCH BACK TO CLAUDE LATER:
# 1. pip install anthropic
# 2. Set ANTHROPIC_API_KEY in .env
# 3. Replace generate_runbook() function with the Claude API version
# 4. Everything else stays the same.

"""
runbook_generator.py — DevGuard AI
Offline, rule-based runbook generation from representative log lines.

No external API, no API key, no network required.
Analyzes log content with keyword matching and returns a structured runbook
using the same JSON schema the rest of the application expects.
"""

import copy
import re

# ---------------------------------------------------------------------------
# Rule templates  (one per incident category)
# ---------------------------------------------------------------------------

_TEMPLATE_DATABASE: dict = {
    "root_cause": "Database connection pool exhausted causing service timeouts",
    "severity": "critical",
    "affected_services": ["api-gateway", "database", "backend-service"],
    "fix_steps": [
        {
            "step": 1,
            "action": "Check active DB connections",
            "command": "SELECT count(*) FROM pg_stat_activity;",
        },
        {
            "step": 2,
            "action": "Kill idle connections",
            "command": (
                "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
                "WHERE state = 'idle';"
            ),
        },
        {
            "step": 3,
            "action": "Restart connection pooler",
            "command": "sudo systemctl restart pgbouncer",
        },
        {
            "step": 4,
            "action": "Increase pool size in config",
            "command": "Edit database.yml: pool_size: 25",
        },
    ],
    "prevention": [
        "Set connection pool limits properly",
        "Add connection pool monitoring alerts",
        "Implement connection timeout policies",
    ],
    "estimated_downtime": "10-20 minutes",
    "infra_cost_impact": "High — every minute of DB downtime affects all services",
}

_TEMPLATE_MEMORY: dict = {
    "root_cause": "Container exceeded memory limit and was OOMKilled by Kubernetes",
    "severity": "high",
    "affected_services": ["kubernetes-pod", "application-service"],
    "fix_steps": [
        {
            "step": 1,
            "action": "Check pod memory usage",
            "command": "kubectl top pods -n production",
        },
        {
            "step": 2,
            "action": "Describe the crashed pod",
            "command": "kubectl describe pod <pod-name> -n production",
        },
        {
            "step": 3,
            "action": "Increase memory limit in deployment yaml",
            "command": "resources: limits: memory: 512Mi",
        },
        {
            "step": 4,
            "action": "Redeploy the service",
            "command": "kubectl rollout restart deployment/<name>",
        },
    ],
    "prevention": [
        "Set proper memory requests and limits",
        "Add memory usage alerts in Grafana",
        "Profile application memory usage regularly",
    ],
    "estimated_downtime": "5-10 minutes",
    "infra_cost_impact": "Medium — pod restart causes brief service interruption",
}

_TEMPLATE_SERVICE_CRASH: dict = {
    "root_cause": "Service is returning 5xx errors or refusing connections",
    "severity": "critical",
    "affected_services": ["api-gateway", "backend-service", "load-balancer"],
    "fix_steps": [
        {
            "step": 1,
            "action": "Check service health status",
            "command": "curl -I http://localhost:8000/health",
        },
        {
            "step": 2,
            "action": "Check service logs",
            "command": "journalctl -u your-service -n 100 --no-pager",
        },
        {
            "step": 3,
            "action": "Restart the crashed service",
            "command": "sudo systemctl restart your-service",
        },
        {
            "step": 4,
            "action": "Check upstream dependencies",
            "command": "ping dependency-host && curl dependency-host/health",
        },
    ],
    "prevention": [
        "Implement health check endpoints",
        "Set up auto-restart policies",
        "Add upstream dependency monitoring",
    ],
    "estimated_downtime": "15-30 minutes",
    "infra_cost_impact": "Critical — full service outage affects all users",
}

_TEMPLATE_DISK: dict = {
    "root_cause": "Disk space exhausted causing write failures across services",
    "severity": "high",
    "affected_services": ["storage-service", "logging-service", "database"],
    "fix_steps": [
        {
            "step": 1,
            "action": "Check disk usage",
            "command": "df -h && du -sh /* 2>/dev/null | sort -rh | head -20",
        },
        {
            "step": 2,
            "action": "Clear old logs",
            "command": "find /var/log -name '*.log' -mtime +7 -delete",
        },
        {
            "step": 3,
            "action": "Clear Docker unused images",
            "command": "docker system prune -af",
        },
        {
            "step": 4,
            "action": "Expand disk volume if needed",
            "command": "aws ec2 modify-volume --size 100 --volume-id vol-xxx",
        },
    ],
    "prevention": [
        "Set up disk usage alerts at 80 percent",
        "Implement log rotation policies",
        "Schedule regular cleanup jobs",
    ],
    "estimated_downtime": "5-15 minutes",
    "infra_cost_impact": "High — disk full stops all write operations",
}

_TEMPLATE_AUTH: dict = {
    "root_cause": "Authentication failures causing users to be blocked from services",
    "severity": "high",
    "affected_services": ["auth-service", "api-gateway", "user-service"],
    "fix_steps": [
        {
            "step": 1,
            "action": "Check auth service status",
            "command": "curl http://auth-service/health",
        },
        {
            "step": 2,
            "action": "Check token expiry config",
            "command": "cat /etc/auth/config.yml | grep token_expiry",
        },
        {
            "step": 3,
            "action": "Rotate expired secrets",
            "command": (
                "kubectl create secret generic auth-secret "
                "--from-literal=key=newkey --dry-run=client -o yaml "
                "| kubectl apply -f -"
            ),
        },
        {
            "step": 4,
            "action": "Restart auth service",
            "command": "kubectl rollout restart deployment/auth-service",
        },
    ],
    "prevention": [
        "Implement token refresh mechanisms",
        "Set up auth failure rate alerts",
        "Use short-lived tokens with refresh",
    ],
    "estimated_downtime": "5-10 minutes",
    "infra_cost_impact": "Medium — auth failures block users but keep services running",
}

_TEMPLATE_DEFAULT: dict = {
    "root_cause": (
        "Unknown incident detected from log patterns — manual review needed"
    ),
    "severity": "medium",
    "affected_services": ["unknown-service"],
    "fix_steps": [
        {
            "step": 1,
            "action": "Review full log file manually",
            "command": "tail -n 500 /var/log/app.log | grep -i error",
        },
        {
            "step": 2,
            "action": "Check all service statuses",
            "command": "systemctl list-units --state=failed",
        },
        {
            "step": 3,
            "action": "Check recent deployments",
            "command": "git log --oneline -10",
        },
        {
            "step": 4,
            "action": "Escalate to on-call engineer",
            "command": (
                "Run: pagerduty-cli trigger "
                "--message 'Unknown incident detected'"
            ),
        },
    ],
    "prevention": [
        "Improve log verbosity and structure",
        "Add more specific monitoring alerts",
        "Document incident patterns for future",
    ],
    "estimated_downtime": "Unknown",
    "infra_cost_impact": "Unknown — assess after root cause identified",
}

# ---------------------------------------------------------------------------
# Detection keyword sets  (all compared against a lowercased log blob)
# ---------------------------------------------------------------------------

_KEYWORDS_DATABASE = frozenset([
    "connection pool",
    "database",
    "db error",
    "postgres",
    "mysql",
    "timeout",
    "too many connections",
])

_KEYWORDS_MEMORY = frozenset([
    "oomkilled",
    "out of memory",
    "memory limit",
    "heap",
    "java.lang.outofmemory",
])

_KEYWORDS_SERVICE_CRASH = frozenset([
    "502",
    "503",
    "service unavailable",
    "connection refused",
    "crashed",
    "killed",
])

_KEYWORDS_DISK = frozenset([
    "no space left",
    "disk full",
    "inode",
    "storage",
])

_KEYWORDS_AUTH = frozenset([
    "401",
    "403",
    "unauthorized",
    "forbidden",
    "token expired",
    "auth failed",
])

# Evaluation order matters — more specific rules come first.
# Memory before Service-Crash because "killed" overlaps with OOMKilled.
_RULES: list[tuple[frozenset, dict]] = [
    (_KEYWORDS_DATABASE,      _TEMPLATE_DATABASE),
    (_KEYWORDS_MEMORY,        _TEMPLATE_MEMORY),
    (_KEYWORDS_SERVICE_CRASH, _TEMPLATE_SERVICE_CRASH),
    (_KEYWORDS_DISK,          _TEMPLATE_DISK),
    (_KEYWORDS_AUTH,          _TEMPLATE_AUTH),
]

# ---------------------------------------------------------------------------
# Service-name extraction helpers
# ---------------------------------------------------------------------------

# Regex patterns that commonly precede or denote a service name in logs.
# e.g. "[api-gateway]", "api-gateway:", "service=auth-service"
_SERVICE_PATTERNS: list[re.Pattern] = [
    re.compile(r"\[([a-z][a-z0-9\-]{2,30})\]"),          # [service-name]
    re.compile(r"service[=:\s]+([a-z][a-z0-9\-]{2,30})"),# service=name
    re.compile(r"app[=:\s]+([a-z][a-z0-9\-]{2,30})"),    # app=name
    re.compile(r"([a-z][a-z0-9\-]{2,30}):\s+(?:error|warn|crit|fatal)"),
]

# Known noise words to filter out — common log tokens that aren't service names
_STOP_WORDS: frozenset = frozenset([
    "error", "warn", "info", "debug", "fatal", "critical",
    "the", "and", "for", "from", "with", "this", "that",
    "null", "true", "false", "none",
])


def extract_services(log_text: str) -> list[str]:
    """
    Scan log text for common service-name patterns using regex.

    Returns a deduplicated list of detected service names, or an empty list
    if none are found.  The caller uses this to override the template's
    default affected_services list.

    Args:
        log_text: Lowercased combined log string.

    Returns:
        List of unique service-name strings (may be empty).
    """
    found: list[str] = []
    seen: set[str] = set()

    for pattern in _SERVICE_PATTERNS:
        for match in pattern.finditer(log_text):
            name = match.group(1).strip("-").strip()
            if name and name not in _STOP_WORDS and name not in seen:
                seen.add(name)
                found.append(name)

    return found


# ---------------------------------------------------------------------------
# Rule-matching logic
# ---------------------------------------------------------------------------

def match_rule(log_text: str) -> dict:
    """
    Evaluate detection rules in priority order against the lowercased log blob.

    Returns a *copy* of the first matching template, or the default template
    if nothing matches, so callers can safely mutate the returned dict.

    Args:
        log_text: Lowercased combined log string.

    Returns:
        A deep copy of the matching template dict.
    """
    for keywords, template in _RULES:
        if any(kw in log_text for kw in keywords):
            return copy.deepcopy(template)

    return copy.deepcopy(_TEMPLATE_DEFAULT)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_runbook(representative_logs: list[str]) -> dict:
    """
    Generate a structured runbook from representative log lines.

    Runs entirely offline — no network, no API key.  Uses keyword matching
    against six rule templates to produce a contextually relevant runbook.

    Args:
        representative_logs: Log lines from ml_pipeline.get_log_representatives().

    Returns:
        A runbook dict with keys: root_cause, severity, affected_services,
        fix_steps, prevention, estimated_downtime, infra_cost_impact.
    """
    # Combine all log lines into one lowercase search string
    combined = " ".join(representative_logs).lower()

    # Detect any service names embedded in the logs
    services = extract_services(combined)

    # Select the matching template (returns a fresh copy)
    runbook = match_rule(combined)

    # Override affected_services with log-detected names when available
    if services:
        runbook["affected_services"] = services

    return runbook
