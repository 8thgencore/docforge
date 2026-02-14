import os
import sys


def run_worker() -> None:
    # Use the current interpreter to avoid PATH issues for the taskiq executable.
    os.execvp(
        sys.executable,
        [
            sys.executable,
            "-m",
            "taskiq",
            "worker",
            "src.tasks.broker:broker",
            "src.tasks.ingest_tasks",
        ],
    )
