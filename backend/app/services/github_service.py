from github import Github, GithubException
from app.core.config import GITHUB_TOKEN


def get_repo_context(repo_full_name: str) -> dict:
    g = Github(GITHUB_TOKEN)

    context = {
        "name": repo_full_name,
        "default_branch": "main",
        "workflows": [],
        "branch_protection": None,
        "lint_configs": [],
    }

    try:
        repo = g.get_repo(repo_full_name)
        context["name"] = repo.full_name
        context["default_branch"] = repo.default_branch
    except GithubException as e:
        # Repo not found or no access — return safe defaults
        return context

    # Fetch GitHub Actions workflows
    try:
        contents = repo.get_contents(".github/workflows")
        if not isinstance(contents, list):
            contents = [contents]
        for f in contents:
            try:
                context["workflows"].append({
                    "name": f.name,
                    "content": f.decoded_content.decode("utf-8")
                })
            except Exception:
                pass
    except Exception:
        pass

    # Fetch branch protection rules
    try:
        branch = repo.get_branch(repo.default_branch)
        protection = branch.get_protection()
        context["branch_protection"] = {
            "required_reviews": protection.required_pull_request_reviews is not None,
            "enforce_admins": protection.enforce_admins,
            "required_status_checks": (
                protection.required_status_checks.contexts
                if protection.required_status_checks else []
            ),
        }
    except Exception:
        pass

    # Fetch lint configs
    for lint_file in [".eslintrc.json", ".eslintrc.js", "pyproject.toml", ".flake8", ".pylintrc"]:
        try:
            f = repo.get_contents(lint_file)
            context["lint_configs"].append({
                "file": lint_file,
                "content": f.decoded_content.decode("utf-8")
            })
        except Exception:
            pass

    return context
