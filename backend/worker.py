from app.core.queue import get_worker


def main() -> None:
    worker = get_worker()
    worker.work(with_scheduler=False)


if __name__ == "__main__":
    main()