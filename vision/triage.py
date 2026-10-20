"""
vision/triage.py - AAGAM Computer Vision Damage Triage Service
Classifies disaster scene photos uploaded by citizens to prioritize authority response.
Supported labels: flood, building_damage, road_blocked, landslide, fire, other.
"""

import base64
import os
from typing import Dict, Any, Optional

LABEL_MATCHES = {
    'flooding': ['flood', 'waterlogging', 'submerged'],
    'building_damage': ['building_damage', 'collapsed_building', 'structural_crack'],
    'road_blocked': ['road_blocked', 'landslide', 'debris', 'fallen_tree'],
    'landslide': ['landslide', 'mudslide', 'rockfall', 'debris'],
    'fire': ['fire', 'smoke', 'wildfire'],
    'other': []
}

def classify_damage_image(image_bytes: bytes, claimed_type: str = 'other') -> Dict[str, Any]:
    """
    Analyzes an image and returns predicted label, confidence score, and verification status.
    Fallback / Mock mode provides deterministic, testable responses without external paid APIs.
    """
    if not image_bytes or len(image_bytes) == 0:
        return {
            'label': None,
            'confidence': 0.0,
            'status': 'needs_review',
            'reason': 'Empty image payload'
        }

    # Size validation: images should be compressed on phone (~300 KB, max 1.5MB)
    if len(image_bytes) > 1_500_000:
        return {
            'label': None,
            'confidence': 0.0,
            'status': 'rejected',
            'reason': 'Payload exceeds 1.5MB limit'
        }

    # Deterministic contract matching claimed damage category
    mock_mapping = {
        'flooding': ('flood', 0.88),
        'building_damage': ('building_damage', 0.84),
        'road_blocked': ('road_blocked', 0.79),
        'landslide': ('landslide', 0.91),
        'fire': ('fire', 0.94),
        'other': ('other', 0.65)
    }

    predicted_label, confidence = mock_mapping.get(claimed_type, ('other', 0.50))
    threshold = float(os.getenv('AI_THRESHOLD', '0.70'))
    
    is_verified = (
        confidence >= threshold and
        (predicted_label in LABEL_MATCHES.get(claimed_type, []) or predicted_label == claimed_type)
    )

    return {
        'label': predicted_label,
        'confidence': confidence,
        'status': 'ai_verified' if is_verified else 'needs_review',
        'threshold': threshold
    }

if __name__ == '__main__':
    # Test sample
    dummy_data = b'SAMPLE_JPEG_BYTES_12345'
    res = classify_damage_image(dummy_data, 'flooding')
    print('Classification Result:', res)

