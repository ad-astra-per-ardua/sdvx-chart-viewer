from slowapi import Limiter
from starlette.requests import Request


def _real_ip(request: Request) -> str:
    # Never read X-Forwarded-For here — it is client-controlled and can be spoofed.
    # When deployed behind a reverse proxy, start uvicorn with
    # --forwarded-allow-ips=<proxy_ip> so the ASGI server updates
    # request.client.host to the real client IP before this runs.
    if request.client:
        return request.client.host
    return "127.0.0.1"


limiter = Limiter(key_func=_real_ip, config_filename="__skip__")
