"""
Memory-efficient training script for mineral classifier.
Streams data and extracts features in small batches.
"""

import gc
import json
import logging
import pickle
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from datasets import load_dataset
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from transformers import CLIPModel, CLIPProcessor

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger(__name__)

# Mapping from dataset class names to our 30 target classes
DIRECT_MAP = {
    "quartz": "Quartz", "calcite": "Calcite", "hematite": "Hematite",
    "magnetite": "Magnetite", "galena": "Galena", "pyrite": "Pyrite",
    "chalcopyrite": "Chalcopyrite", "malachite": "Malachite", "limonite": "Limonite",
    "corundum": "Corundum", "graphite": "Graphite", "fluorite": "Fluorite",
    "apatite": "Apatite", "tourmaline": "Tourmaline", "beryl": "Beryl",
    "topaz": "Topaz", "zircon": "Zircon", "gypsum": "Gypsum",
    "sulfur": "Sulfur", "azurite": "Azurite",
}
GROUP_MAP = {
    "microcline": "Feldspar", "oligoclase": "Feldspar", "orthoclase": "Feldspar", "albite": "Feldspar",
    "muscovite": "Mica",
    "hornblende": "Amphibole", "actinolite": "Amphibole", "tremolite": "Amphibole",
    "augite": "Pyroxene", "diopside": "Pyroxene", "hedenbergite": "Pyroxene",
    "grossular": "Garnet", "andradite": "Garnet", "almandine": "Garnet",
}
ALL_MAP = {**DIRECT_MAP, **GROUP_MAP}

TARGET_CLASSES_PATH = Path(__file__).parent.parent / "models" / "mineral_classes.json"
OUTPUT_DIR = Path(__file__).parent / "data"


def _extract_batch(model, processor, images):
    inputs = processor(images=images, return_tensors="pt")
    with torch.no_grad():
        vision_out = model.vision_model(pixel_values=inputs["pixel_values"])
        feats = model.visual_projection(vision_out.pooler_output)
        feats = F.normalize(feats, dim=-1)
    return feats.cpu().numpy()


def process_split(split, label_names, target_classes, model, processor, split_name):
    """Process a dataset split, extracting CLIP features in streaming fashion."""
    features_list = []
    labels_list = []
    batch_images = []
    batch_labels = []
    batch_size = 16
    processed = 0
    total = len(split)

    for i, example in enumerate(split):
        ds_class_name = label_names[example["name"]].lower()

        if ds_class_name not in ALL_MAP:
            continue

        target_name = ALL_MAP[ds_class_name]
        target_idx = target_classes.index(target_name)

        try:
            img = example["image"].convert("RGB")
        except Exception:
            continue

        batch_images.append(img)
        batch_labels.append(target_idx)

        if len(batch_images) >= batch_size:
            feats = _extract_batch(model, processor, batch_images)
            features_list.append(feats)
            labels_list.extend(batch_labels)
            processed += len(batch_images)
            batch_images.clear()
            batch_labels.clear()

            if processed % 200 == 0:
                logger.info(f"  [{split_name}] {processed} extracted / ~{total}")

    if batch_images:
        feats = _extract_batch(model, processor, batch_images)
        features_list.append(feats)
        labels_list.extend(batch_labels)
        processed += len(batch_images)

    logger.info(f"  [{split_name}] Done: {processed} features")

    if not features_list:
        return np.array([]), np.array([])

    return np.concatenate(features_list, axis=0), np.array(labels_list)


def main():
    with open(TARGET_CLASSES_PATH) as f:
        target_classes = json.load(f)
    logger.info(f"Target classes: {len(target_classes)}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Check if features already extracted
    train_feat_path = OUTPUT_DIR / "features_train.npy"
    if train_feat_path.exists():
        logger.info("Loading pre-extracted features...")
        X_train = np.load(OUTPUT_DIR / "features_train.npy")
        y_train = np.load(OUTPUT_DIR / "labels_train.npy")
        X_val = np.load(OUTPUT_DIR / "features_validation.npy")
        y_val = np.load(OUTPUT_DIR / "labels_validation.npy")
        X_test = np.load(OUTPUT_DIR / "features_test.npy")
        y_test = np.load(OUTPUT_DIR / "labels_test.npy")
    else:
        # Load dataset
        logger.info("Loading dataset...")
        dataset = load_dataset("Nech-C/mineralimage5K-98")
        label_names = dataset["train"].features["name"].names
        logger.info(f"Dataset classes: {len(label_names)}")

        # Load CLIP
        logger.info("Loading CLIP model...")
        model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        model.eval()

        results = {}
        for split_name in ["train", "validation", "test"]:
            logger.info(f"\n=== {split_name} ===")
            X, y = process_split(dataset[split_name], label_names, target_classes, model, processor, split_name)
            np.save(OUTPUT_DIR / f"features_{split_name}.npy", X)
            np.save(OUTPUT_DIR / f"labels_{split_name}.npy", y)
            results[split_name] = (X, y)
            logger.info(f"  Saved: {X.shape}")

        del model, processor, dataset
        gc.collect()

        X_train, y_train = results["train"]
        X_val, y_val = results["validation"]
        X_test, y_test = results["test"]

    logger.info(f"\nTrain: {X_train.shape}, Val: {X_val.shape}, Test: {X_test.shape}")

    # Print distribution
    for name, y in [("Train", y_train), ("Val", y_val), ("Test", y_test)]:
        unique, counts = np.unique(y, return_counts=True)
        logger.info(f"{name}: {dict(zip([target_classes[u] for u in unique], counts.tolist()))}")

    # Hyperparameter search
    logger.info("\n=== Training Classifier ===")
    best_acc = 0
    best_C = 1.0

    for C in [0.01, 0.1, 0.5, 1.0, 5.0, 10.0, 50.0, 100.0]:
        clf = LogisticRegression(C=C, max_iter=2000, solver="lbfgs", multi_class="multinomial", random_state=42)
        clf.fit(X_train, y_train)
        val_acc = accuracy_score(y_val, clf.predict(X_val))
        logger.info(f"  C={C}: val_acc={val_acc:.4f}")
        if val_acc > best_acc:
            best_acc = val_acc
            best_C = C

    logger.info(f"Best: C={best_C}, val_acc={best_acc:.4f}")

    # Final model on train+val
    X_tv = np.concatenate([X_train, X_val])
    y_tv = np.concatenate([y_train, y_val])

    final_clf = LogisticRegression(C=best_C, max_iter=2000, solver="lbfgs", multi_class="multinomial", random_state=42)
    final_clf.fit(X_tv, y_tv)

    test_preds = final_clf.predict(X_test)
    test_acc = accuracy_score(y_test, test_preds)
    logger.info(f"\n*** TEST ACCURACY: {test_acc:.4f} ({test_acc*100:.1f}%) ***\n")

    present = sorted(set(y_test))
    names = [target_classes[i] for i in present]
    print(classification_report(y_test, test_preds, labels=present, target_names=names))

    # Save
    model_path = OUTPUT_DIR / "mineral_classifier_head.pkl"
    with open(model_path, "wb") as f:
        pickle.dump({
            "classifier": final_clf,
            "target_classes": target_classes,
            "best_C": best_C,
            "test_accuracy": test_acc,
            "trained_class_indices": sorted(set(y_tv)),
        }, f)
    logger.info(f"Saved to {model_path}")

    untrained = [target_classes[i] for i in range(len(target_classes)) if i not in set(y_tv)]
    logger.info(f"Zero-shot fallback: {untrained}")


if __name__ == "__main__":
    main()
