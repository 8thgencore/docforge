import uuid

from src.utils.qdrant_filters import build_scope_filter


def test_scope_filter_none_when_empty() -> None:
    assert build_scope_filter(group_id=None) is None


def test_scope_filter_contains_group_only() -> None:
    group_id = uuid.uuid4()
    q_filter = build_scope_filter(group_id=group_id)

    assert q_filter is not None
    assert q_filter.must is not None
    assert len(q_filter.must) == 1
    assert q_filter.must[0].key == "group_id"
