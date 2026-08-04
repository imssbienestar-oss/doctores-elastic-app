# backend_api/cache.py
import json
import hashlib
import time
from typing import Optional

class CountCache:
    def __init__(self):
        self._cache = {}
        self._default_ttl = 300

    def get(self, key: str) -> Optional[int]:
        if key in self._cache:
            entry = self._cache[key]
            if time.time() - entry['time'] < entry['ttl']:
                return entry['value']
            else:
                del self._cache[key]
        return None

    def set(self, key: str, value, ttl: int = None):
        if ttl is None:
            ttl = self._default_ttl
        self._cache[key] = {'value': value, 'time': time.time(), 'ttl': ttl}

    def invalidate(self, pattern: str = None):
        if pattern is None:
            self._cache.clear()
        else:
            keys_to_delete = [k for k in self._cache if pattern in k]
            for k in keys_to_delete:
                del self._cache[k]

count_cache = CountCache()

def generate_cache_key(prefix: str, **params) -> str:
    sorted_params = sorted(params.items())
    params_str = json.dumps(sorted_params, default=str)
    params_hash = hashlib.md5(params_str.encode()).hexdigest()[:8]
    return f"{prefix}:{params_hash}"
