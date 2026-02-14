from uuid import UUID

from qdrant_client import models as qm


def build_scope_filter(group_id: UUID | None, tag: str | None) -> qm.Filter | None:
    must: list[qm.Condition] = []
    if group_id is not None:
        must.append(
            qm.FieldCondition(
                key="group_id",
                match=qm.MatchValue(value=str(group_id)),
            ),
        )
    if tag:
        must.append(
            qm.FieldCondition(
                key="tag",
                match=qm.MatchValue(value=tag),
            ),
        )
    if not must:
        return None
    return qm.Filter(must=must)
