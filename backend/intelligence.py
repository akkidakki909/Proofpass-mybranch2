import sys

try:
    import Intelligence
    sys.modules["intelligence"] = Intelligence
    globals().update(Intelligence.__dict__)
except ImportError:
    pass
