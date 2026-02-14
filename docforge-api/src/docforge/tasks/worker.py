import os


def run_worker() -> None:
    os.execvp(
        "taskiq",
        ["taskiq", "worker", "docforge.tasks.broker:broker", "docforge.tasks.ingest_tasks"],
    )
