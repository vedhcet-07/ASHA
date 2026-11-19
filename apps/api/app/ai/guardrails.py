def validate_ai_output(schema_cls, raw_data):
    """Validate that AI output strictly conforms to the requested Pydantic schema"""
    return schema_cls.model_validate(raw_data)
