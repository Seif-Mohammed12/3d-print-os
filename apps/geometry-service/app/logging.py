import structlog
from typing import Any


def configure_logging(service_name: str, environment: str, debug: bool) -> structlog.stdlib.BoundLogger:
    """Configure structured logging for the service."""
    
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer() if not debug else structlog.dev.ConsoleRenderer(),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    return structlog.get_logger(service_name=service_name, environment=environment)


def get_logger() -> structlog.stdlib.BoundLogger:
    """Get the configured logger instance."""
    return structlog.get_logger()
