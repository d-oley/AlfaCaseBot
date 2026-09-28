import unittest
from unittest.mock import Mock, patch

import numpy as np

from test_reference_evaluation import app


class CensorshipPolicyTests(unittest.TestCase):
    def test_score_boundaries_and_logged_regressions(self):
        threshold = 0.6331059542406778
        cases = [
            ([threshold - 0.00001], False, "below_threshold"),
            ([threshold], False, "single_borderline"),
            ([0.84999], False, "single_borderline"),
            ([0.85], False, "single_borderline"),
            ([0.89999], False, "single_borderline"),
            ([0.9], True, "high_confidence"),
            ([threshold, threshold], True, "multiple_sentences"),
            ([0.6704] + [0.1] * 79, False, "single_borderline"),
            ([0.1, 0.858, 0.1], False, "single_borderline"),
            ([0.9453, 0.911, 0.1, 0.1, 0.1], True, "high_confidence"),
            ([1.0], True, "high_confidence"),
        ]
        for scores, expected, decision in cases:
            with self.subTest(scores=scores):
                model, vectorizer = Mock(), Mock()
                model.predict_proba.return_value = np.array([[1 - s, s] for s in scores])
                sentences = [f"Предложение номер {i}." for i in range(len(scores))]
                with patch.multiple(app, MODEL=model, VECTORIZER=vectorizer, THRESHOLD=threshold), \
                     patch.object(app, "check_language", return_value=(True, None)):
                    result = app.analyze_text(" ".join(sentences))
                self.assertEqual(result["is_toxic"], expected)
                self.assertEqual(result["details"]["decision"], decision)
                self.assertEqual(result["details"]["total"], len(scores))
                vectorizer.transform.assert_called_once_with(sentences)


if __name__ == "__main__":
    unittest.main()
