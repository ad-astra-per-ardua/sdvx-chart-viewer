from slowapi import Limiter
from starlette.requests import Request


def _real_ip(request: Request) -> str:
    if request.client:
        return request.client.host
    return "127.0.0.1"


limiter = Limiter(key_func=_real_ip, config_filename="__skip__")
