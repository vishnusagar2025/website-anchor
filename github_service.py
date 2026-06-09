"""
github_service.py — DevGuard AI
Reusable GitHub REST API service layer.

Supports both public repositories (no token required) and private
repositories (requires GITHUB_TOKEN in environment).

Rate-limit handling:
  - On HTTP 403/429 with a Retry-After header, the service raises
    GitHubRateLimitError with the wait time so callers can decide
    whether to retry or surface the error upstream.
"""

import base64
import os
import time
from dataclasses import dataclass, field
from typing import Optional

import requests

# ---------------------------------------------------------------------------
# Custom exceptions
# ---------------------------------------------------------------------------

class GitHubError(Exception):
    """Base exception for GitHub service errors."""


class GitHubRateLimitError(GitHubError):
    """Raised when the GitHub API rate limit is hit."""
    def __init__(self, retry_after: int = 60):
        self.retry_after = retry_after
        super().__init__(f"GitHub rate limit exceeded. Retry after {retry_after}s.")


class GitHubNotFoundError(GitHubError):
    """Raised when the requested resource does not exist."""


class GitHubAuthError(GitHubError):
    """Raised on authentication failures."""


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class RepoInfo:
    owner: str
    name: str
    description: str
    default_branch: str
    language: str
    stars: int
    forks: int
    open_issues: int
    url: str


@dataclass
class FileContent:
    path: str
    content: str
    size_bytes: int
    sha: str


@dataclass
class CommitInfo:
    sha: str
    message: str
    author: str
    date: str
    url: str


@dataclass
class PRInfo:
    number: int
    title: str
    author: str
    state: str
    base_branch: str
    head_branch: str
    url: str
    changed_files: int


@dataclass
class PRFile:
    path: str
    status: str          # added | modified | removed | renamed
    additions: int
    deletions: int
    content: str = ""    # populated separately via get_file_content


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class GitHubService:
    """
    Thin wrapper around the GitHub REST API v3.

    Usage::

        svc = GitHubService()                  # token from env
        svc = GitHubService(token="ghp_...")   # explicit token
    """

    BASE_URL = "https://api.github.com"
    PLACEHOLDER_TOKENS = {"your_github_pat_here", "", "none", "null"}

    def __init__(self, token: Optional[str] = None):
        raw = token or os.environ.get("GITHUB_TOKEN", "")
        self._token = raw if raw.strip() not in self.PLACEHOLDER_TOKENS else None
        self._session = requests.Session()
        self._session.headers.update({
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        })
        if self._token:
            self._session.headers["Authorization"] = f"Bearer {self._token}"

    # ------------------------------------------------------------------
    # Internal request helper
    # ------------------------------------------------------------------

    def _get(self, path: str, params: Optional[dict] = None) -> dict | list:
        url = f"{self.BASE_URL}{path}"
        resp = self._session.get(url, params=params, timeout=15)

        if resp.status_code in (403, 429):
            retry_after = int(resp.headers.get("Retry-After", 60))
            raise GitHubRateLimitError(retry_after)
        if resp.status_code == 401:
            raise GitHubAuthError("Invalid or expired GitHub token.")
        if resp.status_code == 404:
            raise GitHubNotFoundError(f"Resource not found: {url}")
        resp.raise_for_status()
        return resp.json()

    # ------------------------------------------------------------------
    # Public methods
    # ------------------------------------------------------------------

    def get_repo_info(self, owner: str, repo: str) -> RepoInfo:
        """Return high-level metadata for a GitHub repository."""
        data = self._get(f"/repos/{owner}/{repo}")
        return RepoInfo(
            owner=owner,
            name=data["name"],
            description=data.get("description") or "",
            default_branch=data.get("default_branch", "main"),
            language=data.get("language") or "Unknown",
            stars=data.get("stargazers_count", 0),
            forks=data.get("forks_count", 0),
            open_issues=data.get("open_issues_count", 0),
            url=data.get("html_url", ""),
        )

    def get_repo_tree(
        self,
        owner: str,
        repo: str,
        branch: Optional[str] = None,
    ) -> list[dict]:
        """
        Return the full flat file tree for a repository branch.
        Each item has keys: path, type ('blob'|'tree'), size, sha.
        """
        if not branch:
            branch = self.get_repo_info(owner, repo).default_branch

        data = self._get(
            f"/repos/{owner}/{repo}/git/trees/{branch}",
            params={"recursive": "1"},
        )
        return data.get("tree", [])

    def get_repo_files(
        self,
        owner: str,
        repo: str,
        extensions: Optional[list[str]] = None,
        max_size_bytes: int = 100_000,
        branch: Optional[str] = None,
    ) -> list[str]:
        """
        Return file paths in the repo optionally filtered by extension and size.

        Args:
            extensions: e.g. [".py", ".js"]. None means all files.
            max_size_bytes: Skip files larger than this (default 100 KB).
        """
        tree = self.get_repo_tree(owner, repo, branch)
        paths = []
        for item in tree:
            if item.get("type") != "blob":
                continue
            path = item.get("path", "")
            size = item.get("size", 0) or 0
            if size > max_size_bytes:
                continue
            if extensions:
                if not any(path.endswith(ext) for ext in extensions):
                    continue
            paths.append(path)
        return paths

    def get_file_content(
        self,
        owner: str,
        repo: str,
        path: str,
        ref: Optional[str] = None,
    ) -> FileContent:
        """
        Fetch the decoded text content of a single file.

        Args:
            ref: branch, tag, or commit SHA. Defaults to repo default branch.
        """
        params = {"ref": ref} if ref else {}
        data = self._get(f"/repos/{owner}/{repo}/contents/{path}", params=params)

        if isinstance(data, list):
            raise GitHubError(f"Path '{path}' is a directory, not a file.")

        raw = data.get("content", "")
        # GitHub returns base64 with embedded newlines
        decoded = base64.b64decode(raw.replace("\n", "")).decode("utf-8", errors="replace")

        return FileContent(
            path=path,
            content=decoded,
            size_bytes=data.get("size", 0),
            sha=data.get("sha", ""),
        )

    def get_commits(
        self,
        owner: str,
        repo: str,
        limit: int = 20,
        branch: Optional[str] = None,
    ) -> list[CommitInfo]:
        """Return the most recent commits on a branch (default: default branch)."""
        params: dict = {"per_page": min(limit, 100)}
        if branch:
            params["sha"] = branch

        items = self._get(f"/repos/{owner}/{repo}/commits", params=params)
        assert isinstance(items, list)

        commits = []
        for item in items[:limit]:
            c = item.get("commit", {})
            author_info = c.get("author") or {}
            commits.append(CommitInfo(
                sha=item.get("sha", "")[:7],
                message=(c.get("message") or "").splitlines()[0],
                author=author_info.get("name", "unknown"),
                date=author_info.get("date", ""),
                url=item.get("html_url", ""),
            ))
        return commits

    def get_pull_request(self, owner: str, repo: str, pr_number: int) -> PRInfo:
        """Return metadata for a specific pull request."""
        data = self._get(f"/repos/{owner}/{repo}/pulls/{pr_number}")
        return PRInfo(
            number=pr_number,
            title=data.get("title", ""),
            author=(data.get("user") or {}).get("login", "unknown"),
            state=data.get("state", ""),
            base_branch=(data.get("base") or {}).get("ref", ""),
            head_branch=(data.get("head") or {}).get("ref", ""),
            url=data.get("html_url", ""),
            changed_files=data.get("changed_files", 0),
        )

    def get_pr_changed_files(
        self,
        owner: str,
        repo: str,
        pr_number: int,
        extensions: Optional[list[str]] = None,
        fetch_content: bool = True,
        head_sha: Optional[str] = None,
    ) -> list[PRFile]:
        """
        Return changed files in a pull request, optionally with their content.

        Args:
            extensions: Filter to specific file extensions.
            fetch_content: If True, fetches file content for each matching file.
            head_sha: SHA of the head commit (used when fetching content).
        """
        items = self._get(f"/repos/{owner}/{repo}/pulls/{pr_number}/files")
        assert isinstance(items, list)

        # Resolve head SHA if not provided
        if fetch_content and not head_sha:
            pr = self.get_pull_request(owner, repo, pr_number)
            head_sha = pr.head_branch  # we'll pass the branch name as ref

        pr_files = []
        for item in items:
            path = item.get("filename", "")
            status = item.get("status", "modified")

            if extensions and not any(path.endswith(ext) for ext in extensions):
                continue
            if status == "removed":
                # Deleted files have no content to analyse
                pr_files.append(PRFile(
                    path=path, status=status,
                    additions=item.get("additions", 0),
                    deletions=item.get("deletions", 0),
                    content="",
                ))
                continue

            content = ""
            if fetch_content:
                try:
                    fc = self.get_file_content(owner, repo, path, ref=head_sha)
                    content = fc.content
                except GitHubError:
                    content = ""  # gracefully skip unreadable files

            pr_files.append(PRFile(
                path=path,
                status=status,
                additions=item.get("additions", 0),
                deletions=item.get("deletions", 0),
                content=content,
            ))
        return pr_files
