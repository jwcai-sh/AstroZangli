"""Parse backend Python sources without producing bytecode files."""

import ast
from pathlib import Path


def main() -> None:
    backend_dir = Path(__file__).resolve().parent
    files = sorted(
        path
        for path in backend_dir.rglob("*.py")
        if "venv" not in path.parts and "__pycache__" not in path.parts
    )

    for path in files:
        ast.parse(path.read_text(encoding="utf-8-sig"), filename=str(path))

    print(f"Backend syntax check passed ({len(files)} files).")


if __name__ == "__main__":
    main()
