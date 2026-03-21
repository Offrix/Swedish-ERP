UPDATE inbox_channels
SET classification_confidence_threshold = 0.90,
    field_confidence_threshold = 0.90,
    default_review_queue_code = 'classification_low_confidence',
    updated_at = NOW()
WHERE inbox_channel_id = '00000000-0000-4000-8000-000000000301';
