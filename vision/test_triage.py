"""
vision/test_triage.py - Unit tests for Vision Triage damage verification
"""

import unittest
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from triage import classify_damage_image

class TestVisionTriage(unittest.TestCase):
    def test_valid_flood_classification(self):
        sample = b'MOCK_IMAGE_BYTES_FLOOD'
        result = classify_damage_image(sample, 'flooding')
        self.assertEqual(result['label'], 'flood')
        self.assertGreaterEqual(result['confidence'], 0.70)
        self.assertEqual(result['status'], 'ai_verified')

    def test_fire_classification(self):
        sample = b'MOCK_IMAGE_BYTES_FIRE'
        result = classify_damage_image(sample, 'fire')
        self.assertEqual(result['label'], 'fire')
        self.assertEqual(result['status'], 'ai_verified')

    def test_oversized_image_rejection(self):
        large_bytes = b'0' * 1_600_000
        result = classify_damage_image(large_bytes, 'building_damage')
        self.assertEqual(result['status'], 'rejected')

    def test_empty_image(self):
        result = classify_damage_image(b'', 'flooding')
        self.assertEqual(result['status'], 'needs_review')

if __name__ == '__main__':
    unittest.main()
