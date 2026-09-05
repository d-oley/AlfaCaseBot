"""Offline inference matching training_rubert_tiny2.ipynb."""

from pathlib import Path
from threading import Lock

import torch
from torch import nn
from transformers import AutoConfig, AutoModel, AutoTokenizer


class RuBertMultiTaskRegressor(nn.Module):
    def __init__(self, config, output_count):
        super().__init__()
        self.encoder = AutoModel.from_config(config)
        self.dropout = nn.Dropout(0.2)
        self.regression_head = nn.Linear(config.hidden_size, output_count)

    def forward(self, input_ids, attention_mask, token_type_ids=None):
        output = self.encoder(input_ids=input_ids, attention_mask=attention_mask,
                              token_type_ids=token_type_ids)
        return torch.sigmoid(self.regression_head(self.dropout(output.last_hidden_state[:, 0])))


class Tiny2Predictor:
    REQUIRED_TARGETS = {
        "effectiveness": "score_effectiveness",
        "logic": "score_logic",
        "completeness": "score_completeness",
    }

    def __init__(self, artifact_dir: Path, device="cpu"):
        self.lock = Lock()
        self.device = torch.device(device)
        checkpoint = torch.load(artifact_dir / "rubert_tiny2_multitask.pt",
                                map_location="cpu", weights_only=True)
        self.targets = checkpoint["target_columns"]
        if not set(self.REQUIRED_TARGETS.values()).issubset(self.targets):
            raise ValueError("Tiny2 checkpoint is missing required score targets")
        self.max_length = int(checkpoint["max_length"])
        config = AutoConfig.from_pretrained(artifact_dir, local_files_only=True)
        self.tokenizer = AutoTokenizer.from_pretrained(artifact_dir / "tokenizer", local_files_only=True)
        self.model = RuBertMultiTaskRegressor(config, len(self.targets))
        self.model.load_state_dict(checkpoint["state_dict"], strict=True)
        self.model.to(self.device).eval()

    def predict(self, case_text: str, solution: str) -> dict[str, float]:
        if not case_text.strip() or not solution.strip():
            raise ValueError("Case text and solution must be nonempty")
        with self.lock, torch.inference_mode():
            inputs = self.tokenizer(case_text, solution, truncation="longest_first",
                                    max_length=self.max_length, padding=True, return_tensors="pt")
            outputs = self.model(**{key: value.to(self.device) for key, value in inputs.items()})[0]
            if not torch.isfinite(outputs).all():
                raise ValueError("Tiny2 returned nonfinite scores")
            scores = (outputs.cpu() * 100).tolist()
        return {name: float(scores[self.targets.index(target)])
                for name, target in self.REQUIRED_TARGETS.items()}
