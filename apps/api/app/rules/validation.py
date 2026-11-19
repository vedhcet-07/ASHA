def validate_non_negative(val: float, name: str):
    if val < 0:
        raise ValueError(f"{name} cannot be negative")
