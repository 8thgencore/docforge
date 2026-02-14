from taskiq_redis import ListQueueBroker, RedisAsyncResultBackend

from docforge.core.config import get_settings

settings = get_settings()


def _build_broker() -> ListQueueBroker:
    try:
        broker = ListQueueBroker(settings.redis_url)
    except TypeError:
        broker = ListQueueBroker(url=settings.redis_url)

    try:
        result_backend = RedisAsyncResultBackend(settings.redis_url)
    except TypeError:
        result_backend = RedisAsyncResultBackend(redis_url=settings.redis_url)

    return broker.with_result_backend(result_backend)


broker = _build_broker()
