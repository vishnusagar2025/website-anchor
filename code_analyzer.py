"""
code_analyzer.py — DevGuard AI
Issue Detection Engine: orchestrates GitHub fetching + AI analysis.

Features
--------
- Analyze individual files, full repositories, or pull request diffs.
- Automatically chunks large files (>200 lines) into overlapping 150-line
  windows so the AI context window is never exceeded.
- Deduplicates issues by (file, line, issue_type) across chunks.
- Returns a unified list of issues sorted by severity.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Optional

import ai_service
import github_service

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CHUNK_SIZE = 150          # lines per chunk sent to AI
CHUNK_OVERLAP = 20        # overlapping lines between chunks (for context)
CHUNK_THRESHOLD = 200     # files larger than this are chunked

SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}

# Default extensions to analyze when none are specified
DEFAULT_EXTENSIONS = [
    ".py", ".js", ".ts", ".jsx", ".tsx",
    ".java", ".go", ".rb", ".php", ".cs",
    ".cpp", ".c", ".h", ".rs", ".kt",
]


# ---------------------------------------------------------------------------
# Chunking helpers
# ---------------------------------------------------------------------------

def _chunk_code(content: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[tuple[int, str]]:
    """
    Split code into overlapping chunks.

    Returns a list of (start_line, chunk_text) tuples where start_line is
    1-indexed so line numbers in AI responses are meaningful.
    """
    lines = content.splitlines()
    if len(lines) <= chunk_size:
        return [(1, content)]

    chunks = []
    start = 0
    while start < len(lines):
        end = min(start + chunk_size, len(lines))
        chunk_lines = lines[start:end]
        chunks.append((start + 1, "\n".join(chunk_lines)))
        if end == len(lines):
            break
        start += chunk_size - overlap
    return chunks


def _adjust_line_numbers(issues: list[dict], offset: int) -> list[dict]:
    """
    Add a line-number offset to all issues from a chunk.

    Handles both plain integers ("42") and ranges ("10-15").
    """
    adjusted = []
    for issue in issues:
        raw = str(issue.get("line_number", ""))
        try:
            if "-" in raw:
                lo, hi = raw.split("-", 1)
                new_ln = f"{int(lo.strip()) + offset - 1}-{int(hi.strip()) + offset - 1}"
            else:
                new_ln = str(int(raw) + offset - 1)
        except ValueError:
            new_ln = raw  # leave as-is if unparseable
        adjusted.append({**issue, "line_number": new_ln})
    return adjusted


# ---------------------------------------------------------------------------
# Deduplication
# ---------------------------------------------------------------------------

def _dedup_issues(issues: list[dict]) -> list[dict]:
    """Remove duplicate issues by (file_name, line_number, issue_type)."""
    seen: set[tuple] = set()
    unique = []
    for issue in issues:
        key = (
            issue.get("file_name", ""),
            str(issue.get("line_number", "")),
            issue.get("issue_type", ""),
        )
        if key not in seen:
            seen.add(key)
            unique.append(issue)
    return unique


def _sort_issues(issues: list[dict]) -> list[dict]:
    """Sort issues by severity (critical → low)."""
    return sorted(
        issues,
        key=lambda i: SEVERITY_ORDER.get(
            str(i.get("severity", "low")).lower(), 99
        ),
    )


# ---------------------------------------------------------------------------
# Core analysis functions
# ---------------------------------------------------------------------------

def analyze_file(file_name: str, content: str) -> list[dict]:
    """
    Analyze a single file and return a flat list of issues.

    Large files are automatically chunked and their line numbers adjusted.
    """
    provider = ai_service.get_ai_provider()
    lines = content.splitlines()

    if len(lines) <= CHUNK_THRESHOLD:
        result = provider.analyze_code(file_name, content)
        return result.get("issues", [])

    # Chunked analysis
    all_issues: list[dict] = []
    chunks = _chunk_code(content)
    for start_line, chunk_text in chunks:
        result = provider.analyze_code(file_name, chunk_text)
        chunk_issues = result.get("issues", [])
        # Adjust line numbers relative to the full file
        adjusted = _adjust_line_numbers(chunk_issues, start_line)
        all_issues.extend(adjusted)

    return _dedup_issues(all_issues)


def analyze_repository(
    owner: str,
    repo: str,
    extensions: Optional[list[str]] = None,
    max_files: int = 30,
    branch: Optional[str] = None,
) -> dict:
    """
    Analyze all source files in a GitHub repository.

    Args:
        owner: GitHub username or org.
        repo: Repository name.
        extensions: File extensions to include. Defaults to DEFAULT_EXTENSIONS.
        max_files: Hard cap on number of files analyzed (to control API cost).
        branch: Branch to analyze. Defaults to the repo's default branch.

    Returns:
        {
          "repo": "owner/repo",
          "files_analyzed": N,
          "total_issues": N,
          "issues": [...],
          "summary": {...}
        }
    """
    exts = extensions or DEFAULT_EXTENSIONS
    svc = github_service.GitHubService()

    # Fetch file list
    file_paths = svc.get_repo_files(owner, repo, extensions=exts, branch=branch)
    file_paths = file_paths[:max_files]

    all_issues: list[dict] = []
    files_analyzed = 0
    errors: list[str] = []

    for path in file_paths:
        try:
            fc = svc.get_file_content(owner, repo, path, ref=branch)
            if not fc.content.strip():
                continue
            issues = analyze_file(fc.path, fc.content)
            all_issues.extend(issues)
            files_analyzed += 1
        except github_service.GitHubRateLimitError as e:
            errors.append(f"Rate limit hit at {path}. Retry after {e.retry_after}s.")
            break
        except github_service.GitHubError as e:
            errors.append(f"Skipped {path}: {e}")
            continue

    all_issues = _dedup_issues(all_issues)
    all_issues = _sort_issues(all_issues)

    return {
        "repo": f"{owner}/{repo}",
        "branch": branch or "default",
        "files_analyzed": files_analyzed,
        "total_issues": len(all_issues),
        "issues": all_issues,
        "summary": _build_summary(all_issues),
        "errors": errors,
    }


def analyze_pull_request(
    owner: str,
    repo: str,
    pr_number: int,
    extensions: Optional[list[str]] = None,
) -> dict:
    """
    Analyze only the files changed in a pull request.

    Args:
        owner: GitHub username or org.
        repo: Repository name.
        pr_number: Pull request number.
        extensions: File extensions to include. Defaults to DEFAULT_EXTENSIONS.

    Returns:
        {
          "repo": "owner/repo",
          "pr_number": N,
          "pr_title": "...",
          "files_analyzed": N,
          "total_issues": N,
          "issues": [...],
          "summary": {...}
        }
    """
    exts = extensions or DEFAULT_EXTENSIONS
    svc = github_service.GitHubService()

    pr_info = svc.get_pull_request(owner, repo, pr_number)
    pr_files = svc.get_pr_changed_files(
        owner, repo, pr_number,
        extensions=exts,
        fetch_content=True,
        head_sha=pr_info.head_branch,
    )

    all_issues: list[dict] = []
    files_analyzed = 0
    errors: list[str] = []

    for prf in pr_files:
        if not prf.content or not prf.content.strip():
            continue
        try:
            issues = analyze_file(prf.path, prf.content)
            all_issues.extend(issues)
            files_analyzed += 1
        except Exception as e:
            errors.append(f"Skipped {prf.path}: {e}")
            continue

    all_issues = _dedup_issues(all_issues)
    all_issues = _sort_issues(all_issues)

    return {
        "repo": f"{owner}/{repo}",
        "pr_number": pr_number,
        "pr_title": pr_info.title,
        "pr_author": pr_info.author,
        "pr_url": pr_info.url,
        "files_analyzed": files_analyzed,
        "total_issues": len(all_issues),
        "issues": all_issues,
        "summary": _build_summary(all_issues),
        "errors": errors,
    }


# ---------------------------------------------------------------------------
# Summary builder
# ---------------------------------------------------------------------------

def _build_summary(issues: list[dict]) -> dict:
    """Build a severity/type breakdown summary from an issue list."""
    severity_counts: dict[str, int] = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    type_counts: dict[str, int] = {}

    for issue in issues:
        sev = str(issue.get("severity", "low")).lower()
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

        itype = str(issue.get("issue_type", "Unknown"))
        type_counts[itype] = type_counts.get(itype, 0) + 1

    return {
        "by_severity": severity_counts,
        "by_type": type_counts,
        "critical_count": severity_counts.get("critical", 0),
        "requires_immediate_action": severity_counts.get("critical", 0) > 0,
    }
