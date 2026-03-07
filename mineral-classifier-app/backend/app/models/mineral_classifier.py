"""
Mineral Classification Model using CLIP + Trained Linear Probe.
Uses OpenAI CLIP features with a supervised classifier trained on
the mineralimage5K-98 dataset for high-accuracy classification.
Falls back to zero-shot for minerals without training data.
"""

import pickle
import time
import json
import logging
from pathlib import Path
from typing import Dict, List

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image, ImageOps
from transformers import CLIPModel, CLIPProcessor

logger = logging.getLogger(__name__)

# Detailed visual descriptions for each mineral (multiple prompts per class for ensemble)
MINERAL_VISUAL_PROMPTS: Dict[str, List[str]] = {
    "Quartz": [
        "a photograph of quartz mineral, transparent or white crystalline rock with vitreous glassy luster and hexagonal prismatic crystal shape",
        "a close-up photo of quartz crystal specimen, clear glassy hexagonal prism with pointed termination and conchoidal fracture",
        "quartz mineral sample showing vitreous luster, varieties include amethyst purple, rose quartz pink, citrine yellow, smoky gray brown",
        "a rock specimen of crystalline quartz, silicon dioxide SiO2, hard transparent to translucent mineral with glass-like shine",
    ],
    "Feldspar": [
        "a photograph of feldspar mineral, pink white or gray blocky crystal with vitreous to pearly luster and two cleavage directions",
        "a close-up photo of feldspar specimen, tabular blocky crystals with flat cleavage surfaces, common rock-forming mineral",
        "feldspar mineral sample showing pink or white color, blocky shape with two perfect cleavage planes at nearly right angles",
        "a rock specimen of feldspar, orthoclase or plagioclase, showing characteristic blocky crystals and pearly sheen on cleavage faces",
    ],
    "Mica": [
        "a photograph of mica mineral, thin flexible transparent sheets and flakes with pearly luster and perfect basal cleavage",
        "a close-up photo of mica specimen, silvery or brown thin flaky sheets that can be peeled apart, sheet silicate mineral",
        "mica mineral sample showing perfect basal cleavage into thin elastic sheets, muscovite silvery white or biotite dark brown black",
        "a rock specimen of mica flakes, layered sheet mineral with pearly metallic luster, splits into thin transparent flexible layers",
    ],
    "Calcite": [
        "a photograph of calcite mineral, white colorless or yellow rhombohedral crystal with vitreous luster and perfect cleavage",
        "a close-up photo of calcite specimen, rhombohedron shaped crystal showing double refraction and perfect rhombic cleavage",
        "calcite mineral sample, calcium carbonate CaCO3, showing rhombohedral cleavage fragments with vitreous luster",
        "a rock specimen of calcite crystal, transparent to white with rhombic shape, reacts with hydrochloric acid, found in limestone and marble",
    ],
    "Hematite": [
        "a photograph of hematite mineral, dark red gray or black iron oxide with metallic to earthy luster and red streak",
        "a close-up photo of hematite specimen, steel gray metallic botryoidal kidney-shaped or tabular iron ore with reddish tint",
        "hematite mineral sample showing metallic silvery gray surface or earthy red-brown color, very heavy iron oxide Fe2O3",
        "a rock specimen of hematite, iron ore with metallic luster when polished, botryoidal rounded surfaces, leaves red powder streak",
    ],
    "Magnetite": [
        "a photograph of magnetite mineral, black magnetic iron oxide with bright metallic luster and octahedral crystal shape",
        "a close-up photo of magnetite specimen, shiny black octahedral crystals of magnetic iron ore, very heavy and dense",
        "magnetite mineral sample, black opaque strongly magnetic iron oxide Fe3O4 with metallic luster",
        "a rock specimen of magnetite, naturally magnetic black mineral with octahedral crystals and metallic sheen",
    ],
    "Galena": [
        "a photograph of galena mineral, bright silvery lead-gray metallic cubic crystals with perfect cubic cleavage, very heavy",
        "a close-up photo of galena specimen, shiny metallic lead sulfide with perfect cubic crystal form and cubic cleavage planes",
        "galena mineral sample showing bright metallic silver-gray color, heavy cubic crystals with stepped cubic cleavage surfaces",
        "a rock specimen of galena, lead ore PbS, bright metallic silver cubes, extremely heavy and dense with perfect cubic cleavage",
    ],
    "Pyrite": [
        "a photograph of pyrite mineral, brass yellow golden metallic cubic crystals known as fools gold with striated faces",
        "a close-up photo of pyrite specimen, bright brassy yellow metallic cubes or pyritohedrons, iron sulfide fools gold",
        "pyrite mineral sample showing pale brass-yellow metallic cubic or pentagonal dodecahedral crystals with striations on crystal faces",
        "a rock specimen of pyrite fools gold, shiny golden metallic iron sulfide FeS2 with distinctive cubic crystal habit",
    ],
    "Chalcopyrite": [
        "a photograph of chalcopyrite mineral, brass yellow with iridescent blue purple tarnish, metallic copper iron sulfide",
        "a close-up photo of chalcopyrite specimen, brassy yellow metallic mineral with colorful iridescent peacock tarnish surface",
        "chalcopyrite mineral sample, copper ore CuFeS2, brass-yellow with multicolored iridescent oxidation tarnish, softer than pyrite",
        "a rock specimen of chalcopyrite, golden metallic copper iron sulfide with characteristic iridescent blue purple green tarnish",
    ],
    "Malachite": [
        "a photograph of malachite mineral, vivid bright green banded copper carbonate with botryoidal rounded form and silky luster",
        "a close-up photo of malachite specimen, rich green bands and concentric patterns, polished copper carbonate mineral",
        "malachite mineral sample showing characteristic bright green banded patterns, botryoidal rounded masses with silky vitreous luster",
        "a rock specimen of malachite, bright emerald green banded copper mineral Cu2CO3(OH)2, often found with azurite blue mineral",
    ],
    "Limonite": [
        "a photograph of limonite mineral, yellow-brown rusty earthy iron oxyhydroxide with dull earthy luster, amorphous",
        "a close-up photo of limonite specimen, yellow brown rusty weathered iron mineral with earthy to submetallic luster",
        "limonite mineral sample showing rusty yellow-brown to dark brown color, earthy amorphous iron oxide hydroxide FeOOH",
        "a rock specimen of limonite, rusty brown yellow earthy iron mineral, weathering product of iron-bearing minerals",
    ],
    "Bauxite": [
        "a photograph of bauxite mineral, reddish brown pisolitic clay-like aluminum ore with earthy dull texture",
        "a close-up photo of bauxite specimen, red-brown rounded pellet pisolitic texture, primary aluminum ore rock",
        "bauxite mineral sample showing reddish brown earthy appearance with rounded pisolitic concretionary texture, lightweight",
        "a rock specimen of bauxite, aluminum ore with red brown yellow earthy clay-like mass with pisolitic rounded structures",
    ],
    "Corundum": [
        "a photograph of corundum mineral, hard crystalline aluminum oxide with adamantine vitreous luster, hexagonal barrel-shaped crystal",
        "a close-up photo of corundum specimen, very hard mineral including ruby red and sapphire blue, hexagonal prismatic crystal",
        "corundum mineral sample, aluminum oxide Al2O3, extremely hard gemstone mineral, hexagonal barrel or tabular crystal shape",
        "a rock specimen of corundum, second hardest mineral, red ruby or blue sapphire variety, hexagonal crystal with adamantine luster",
    ],
    "Diamond": [
        "a photograph of diamond mineral, brilliant transparent crystal with adamantine luster, octahedral crystal shape, hardest mineral",
        "a close-up photo of diamond specimen, extremely brilliant transparent carbon crystal with adamantine luster and octahedral form",
        "diamond mineral sample, pure crystalline carbon C, transparent with exceptional brilliance and fire, octahedral crystal habit",
        "a rock specimen of raw uncut diamond crystal, transparent to translucent adamantine carbon mineral, octahedral or cubic form",
    ],
    "Graphite": [
        "a photograph of graphite mineral, steel gray to black soft greasy metallic carbon mineral that marks paper",
        "a close-up photo of graphite specimen, dark gray to black soft flaky mineral with metallic greasy luster and greasy feel",
        "graphite mineral sample, soft black carbon mineral C with metallic to dull luster, greasy slippery feel, hexagonal flakes",
        "a rock specimen of graphite, soft black pencil mineral, leaves gray-black marks, foliated flaky metallic to earthy luster",
    ],
    "Olivine": [
        "a photograph of olivine mineral, olive green to yellow-green glassy granular silicate crystals found in basalt",
        "a close-up photo of olivine specimen, bright olive green vitreous glassy crystals, gem variety is peridot",
        "olivine mineral sample showing olive green to yellow-green color, vitreous luster, granular or prismatic crystals in dark rock",
        "a rock specimen of olivine peridot, green glassy magnesium iron silicate (Mg,Fe)2SiO4 in volcanic basaltic rock",
    ],
    "Amphibole": [
        "a photograph of amphibole hornblende mineral, dark green to black elongated prismatic crystal with vitreous luster and 56 degree cleavage",
        "a close-up photo of amphibole specimen, dark green-black long prismatic or needle-like crystals with two cleavage directions at 56 degrees",
        "amphibole mineral sample, hornblende variety, dark green to black elongated crystals with vitreous luster and diamond-shaped cross section",
        "a rock specimen of amphibole hornblende, dark elongated prismatic crystals in igneous or metamorphic rock with characteristic cleavage angles",
    ],
    "Pyroxene": [
        "a photograph of pyroxene augite mineral, dark green to black short stubby prismatic crystal with vitreous luster and near 90 degree cleavage",
        "a close-up photo of pyroxene specimen, dark green-black short prismatic or blocky crystals with two cleavage planes at approximately 90 degrees",
        "pyroxene mineral sample, augite variety, dark green to black stubby prismatic crystals with vitreous luster and square cross section",
        "a rock specimen of pyroxene augite, short dark prismatic crystals in basalt or gabbro with nearly right-angle cleavage",
    ],
    "Fluorite": [
        "a photograph of fluorite mineral, purple blue green yellow or colorless cubic or octahedral crystals with vitreous luster and fluorescence",
        "a close-up photo of fluorite specimen, colorful transparent cubic crystals showing purple green blue or yellow, calcium fluoride CaF2",
        "fluorite mineral sample, beautiful colored cubic octahedral crystals with perfect cleavage, often purple or green, fluorescent under UV light",
        "a rock specimen of fluorite, vividly colored transparent cubic crystals, purple green blue yellow, with vitreous glassy luster",
    ],
    "Apatite": [
        "a photograph of apatite mineral, green blue yellow or purple hexagonal prismatic crystal with vitreous luster",
        "a close-up photo of apatite specimen, hexagonal prismatic crystals in green blue or yellow, calcium phosphate mineral",
        "apatite mineral sample showing hexagonal prismatic crystal form, green blue or yellow color with vitreous luster",
        "a rock specimen of apatite, hexagonal crystals of calcium phosphate, green or blue-green with glassy vitreous luster",
    ],
    "Tourmaline": [
        "a photograph of tourmaline mineral, black pink green or watermelon multicolored elongated striated prismatic crystal with triangular cross section",
        "a close-up photo of tourmaline specimen, long prismatic heavily striated crystal, black schorl or colorful elbaite variety",
        "tourmaline mineral sample showing elongated prismatic striated crystal with rounded triangular cross-section, black green pink or multicolored",
        "a rock specimen of tourmaline, elongated striated prismatic borosilicate crystal, often black (schorl) or colorful watermelon variety",
    ],
    "Beryl": [
        "a photograph of beryl mineral, hexagonal prismatic crystal, green emerald or blue aquamarine variety with vitreous luster",
        "a close-up photo of beryl specimen, elongated hexagonal prismatic crystal in green blue yellow or pink, beryllium aluminum silicate",
        "beryl mineral sample, hexagonal prismatic crystal form, varieties include green emerald, blue aquamarine, pink morganite, yellow heliodor",
        "a rock specimen of beryl crystal, hexagonal prism shape, transparent to translucent with vitreous luster, green or blue colored",
    ],
    "Topaz": [
        "a photograph of topaz mineral, yellow blue colorless or pink orthorhombic prismatic crystal with vitreous luster and perfect basal cleavage",
        "a close-up photo of topaz specimen, transparent prismatic crystal in yellow blue or colorless, hard gemstone mineral",
        "topaz mineral sample showing orthorhombic prismatic crystal habit, yellow blue pink or colorless with vitreous glassy luster",
        "a rock specimen of topaz, transparent prismatic aluminum silicate crystal, yellow-orange or sky blue with perfect basal cleavage",
    ],
    "Garnet": [
        "a photograph of garnet mineral, dark red or brown dodecahedral or trapezohedral crystal with vitreous luster and no cleavage",
        "a close-up photo of garnet specimen, well-formed equant dodecahedral crystals in deep red brown or green, hard silicate mineral",
        "garnet mineral sample showing characteristic 12-sided dodecahedral or 24-sided trapezohedral crystal form, deep red to brown color",
        "a rock specimen of garnet crystals, rounded equant deep red brown or green crystals embedded in metamorphic rock, vitreous luster",
    ],
    "Zircon": [
        "a photograph of zircon mineral, brown reddish or colorless tetragonal prismatic crystal with adamantine luster and high density",
        "a close-up photo of zircon specimen, small tetragonal prismatic crystal with bipyramidal termination, brown or colorless with brilliant luster",
        "zircon mineral sample, tetragonal prismatic crystal with four-sided pyramid ends, brown reddish or colorless, very hard and dense",
        "a rock specimen of zircon, small brilliant tetragonal crystal of zirconium silicate ZrSiO4, adamantine luster, brown or colorless",
    ],
    "Talc": [
        "a photograph of talc mineral, white gray or green very soft soapy-feeling mineral with pearly greasy luster",
        "a close-up photo of talc specimen, extremely soft white to green mineral with greasy soapy feel and pearly luster",
        "talc mineral sample, softest mineral on Mohs scale hardness 1, white gray or pale green with pearly greasy foliated texture",
        "a rock specimen of talc soapstone, very soft white-green mineral that feels greasy and soapy, can be scratched with fingernail",
    ],
    "Gypsum": [
        "a photograph of gypsum mineral, white or colorless soft transparent crystal with vitreous to pearly luster, tabular or fibrous form",
        "a close-up photo of gypsum specimen, clear selenite crystal or white alabaster variety, very soft mineral with pearly luster",
        "gypsum mineral sample, soft calcium sulfate CaSO4·2H2O, transparent selenite blades or white massive alabaster or fibrous satin spar",
        "a rock specimen of gypsum crystal, clear transparent tabular selenite, white fibrous satin spar, or massive alabaster variety, very soft",
    ],
    "Sulfur": [
        "a photograph of sulfur mineral, bright vivid yellow orthorhombic crystals with resinous to adamantine luster",
        "a close-up photo of sulfur specimen, brilliant lemon yellow native element crystals with resinous waxy luster",
        "sulfur mineral sample, native element S, bright canary yellow orthorhombic dipyramidal crystals with resinous luster, distinctive smell",
        "a rock specimen of native sulfur, vivid bright yellow crystalline mass or powder with characteristic resinous luster around volcanic vents",
    ],
    "Halite": [
        "a photograph of halite mineral, colorless white or blue transparent cubic crystal with vitreous luster and perfect cubic cleavage, rock salt",
        "a close-up photo of halite rock salt specimen, clear transparent or white cubic crystals with perfect cubic cleavage and glassy luster",
        "halite mineral sample, sodium chloride NaCl table salt mineral, transparent cubic crystals with perfect cubic cleavage and vitreous luster",
        "a rock specimen of halite rock salt, colorless to white cubic crystal form with characteristic cubic cleavage and salty taste",
    ],
    "Azurite": [
        "a photograph of azurite mineral, vivid deep azure blue copper carbonate crystal with vitreous luster and monoclinic form",
        "a close-up photo of azurite specimen, intense deep blue prismatic or tabular crystals of copper carbonate, often with green malachite",
        "azurite mineral sample, brilliant deep blue copper carbonate Cu3(CO3)2(OH)2, prismatic or massive form with vitreous luster",
        "a rock specimen of azurite, strikingly deep blue copper mineral often associated with green malachite, vitreous prismatic crystals",
    ],
}


class MineralClassifier:
    """
    CLIP-based mineral classifier with trained linear probe.
    Uses a LogisticRegression head trained on 9,000+ real mineral images
    from the mineralimage5K-98 dataset. Falls back to zero-shot CLIP
    for minerals without training data (Bauxite, Diamond, Olivine, Talc, Halite).
    """

    def __init__(self, classes_path: str, device: str = "cpu"):
        self.device = torch.device(device)

        # Load class labels
        classes_path = Path(classes_path)
        if not classes_path.exists():
            raise FileNotFoundError(f"Classes file not found: {classes_path}")

        with open(classes_path, "r") as f:
            self.classes = json.load(f)

        logger.info(f"Loaded {len(self.classes)} mineral classes")

        # Load CLIP model
        model_name = "openai/clip-vit-base-patch32"
        logger.info(f"Loading CLIP model: {model_name}")
        self.model = CLIPModel.from_pretrained(model_name)
        self.processor = CLIPProcessor.from_pretrained(model_name)
        self.model.eval()
        self.model.to(self.device)
        logger.info("CLIP model loaded successfully")

        # Load trained classifier head
        self.classifier_head = None
        self.trained_class_indices = set()
        classifier_path = Path(__file__).resolve().parent.parent / "data" / "mineral_classifier_head.pkl"
        if classifier_path.exists():
            with open(classifier_path, "rb") as f:
                data = pickle.load(f)
            self.classifier_head = data["classifier"]
            self.trained_class_indices = set(data.get("trained_class_indices", []))
            logger.info(f"Loaded trained classifier (test_acc={data.get('test_accuracy', 'N/A'):.1%})")
        else:
            logger.warning(f"No trained classifier found at {classifier_path}, using zero-shot only")

        # Pre-compute text embeddings for zero-shot fallback
        self.text_embeddings = self._compute_text_embeddings()
        logger.info("Pre-computed text embeddings for zero-shot fallback")

    def _get_text_features(self, input_ids: torch.Tensor, attention_mask: torch.Tensor) -> torch.Tensor:
        """Extract projected text features compatible with transformers 5.x."""
        text_outputs = self.model.text_model(input_ids=input_ids, attention_mask=attention_mask)
        return self.model.text_projection(text_outputs.pooler_output)

    def _get_vision_features(self, pixel_values: torch.Tensor) -> torch.Tensor:
        """Extract projected vision features compatible with transformers 5.x."""
        vision_outputs = self.model.vision_model(pixel_values=pixel_values)
        return self.model.visual_projection(vision_outputs.pooler_output)

    def _compute_text_embeddings(self) -> torch.Tensor:
        """Pre-compute averaged text embeddings for each mineral class."""
        all_embeddings = []

        for mineral_name in self.classes:
            prompts = MINERAL_VISUAL_PROMPTS.get(mineral_name, [
                f"a photograph of {mineral_name} mineral",
                f"a close-up photo of {mineral_name} mineral specimen",
                f"a rock sample of {mineral_name}",
                f"{mineral_name} mineral crystal photo",
            ])

            inputs = self.processor(text=prompts, return_tensors="pt", padding=True, truncation=True)

            with torch.no_grad():
                text_features = self._get_text_features(
                    input_ids=inputs["input_ids"].to(self.device),
                    attention_mask=inputs["attention_mask"].to(self.device),
                )
                text_features = F.normalize(text_features, dim=-1)
                avg_embedding = text_features.mean(dim=0)
                avg_embedding = F.normalize(avg_embedding, dim=-1)

            all_embeddings.append(avg_embedding)

        return torch.stack(all_embeddings).to(self.device)

    def _get_image_embedding(self, image: Image.Image) -> torch.Tensor:
        """Compute CLIP image embedding for a single image."""
        inputs = self.processor(images=image, return_tensors="pt")

        with torch.no_grad():
            image_features = self._get_vision_features(
                pixel_values=inputs["pixel_values"].to(self.device),
            )
            image_features = F.normalize(image_features, dim=-1)

        return image_features

    def _get_augmented_embedding(self, image: Image.Image) -> torch.Tensor:
        """Compute averaged image embedding using test-time augmentations."""
        augmented_images = [image]
        augmented_images.append(ImageOps.mirror(image))

        w, h = image.size
        for scale in [0.9, 0.85]:
            cw, ch = int(w * scale), int(h * scale)
            left, top = (w - cw) // 2, (h - ch) // 2
            augmented_images.append(image.crop((left, top, left + cw, top + ch)))

        embeddings = []
        for aug_img in augmented_images:
            emb = self._get_image_embedding(aug_img)
            embeddings.append(emb)

        avg_embedding = torch.stack(embeddings).mean(dim=0)
        avg_embedding = F.normalize(avg_embedding, dim=-1)
        return avg_embedding

    def predict(self, image_path: str, top_k: int = 5) -> Dict:
        """
        Classify a mineral image using trained classifier + zero-shot ensemble.
        """
        image_path = Path(image_path)
        if not image_path.exists():
            raise FileNotFoundError(f"Image not found: {image_path}")

        start_time = time.time()

        try:
            image = Image.open(image_path).convert("RGB")

            # Get CLIP image embedding with augmentation
            image_embedding = self._get_augmented_embedding(image)
            features_np = image_embedding.cpu().numpy()

            # === Trained classifier (primary) ===
            if self.classifier_head is not None:
                # Get probability estimates from the trained linear probe
                trained_probs = self.classifier_head.predict_proba(features_np)[0]
                trained_classes = self.classifier_head.classes_

                # Build full probability array for all 30 classes
                full_probs = np.zeros(len(self.classes))
                for i, cls_idx in enumerate(trained_classes):
                    full_probs[cls_idx] = trained_probs[i]

                # === Zero-shot for untrained classes ===
                similarities = (image_embedding @ self.text_embeddings.T).squeeze(0)
                zs_probs = F.softmax(similarities / 0.01, dim=-1).cpu().numpy()

                # For untrained classes, use zero-shot probabilities
                untrained_indices = [i for i in range(len(self.classes)) if i not in self.trained_class_indices]
                if untrained_indices:
                    # Scale zero-shot probs for untrained classes
                    zs_untrained_sum = sum(zs_probs[i] for i in untrained_indices)
                    if zs_untrained_sum > 0:
                        for i in untrained_indices:
                            # Give untrained classes a fair chance but weighted by zero-shot
                            full_probs[i] = zs_probs[i] * 0.3  # Scale down since less reliable

                # Normalize to sum to 1
                total = full_probs.sum()
                if total > 0:
                    full_probs /= total

                probabilities = torch.tensor(full_probs, dtype=torch.float32)
            else:
                # Pure zero-shot fallback
                similarities = (image_embedding @ self.text_embeddings.T).squeeze(0)
                probabilities = F.softmax(similarities / 0.01, dim=-1)

            top_probs, top_indices = torch.topk(
                probabilities, k=min(top_k, len(self.classes))
            )

            primary_idx = top_indices[0].item()
            primary_class = self.classes[primary_idx]
            primary_confidence = float(top_probs[0].item())

            alternatives = [
                {
                    "class": self.classes[idx.item()],
                    "confidence": float(prob.item()),
                }
                for idx, prob in zip(top_indices[1:], top_probs[1:])
            ]

            inference_time = int((time.time() - start_time) * 1000)

            return {
                "primary": {
                    "class": primary_class,
                    "confidence": primary_confidence,
                },
                "alternatives": alternatives,
                "inference_time_ms": inference_time,
            }

        except Exception as e:
            logger.error(f"Prediction error: {e}")
            raise ValueError(f"Failed to classify image: {e}")
