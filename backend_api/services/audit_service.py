from datetime import datetime, timezone
from sqlalchemy.orm import Session
from .. import models


def log_action(
    db: Session,
    user,
    action_type: str,
    target_entity: str = None,
    target_id_str: str = None,
    details: str = None
):
    username_to_log = "System"
    user_id_to_log = None

    if user:
        username_to_log = user.username
        user_id_to_log = user.id

    log_entry = models.AuditLog(
        user_id=user_id_to_log,
        username=username_to_log,
        action_type=action_type,
        target_entity=target_entity,
        target_id_str=target_id_str,
        details=details,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(log_entry)